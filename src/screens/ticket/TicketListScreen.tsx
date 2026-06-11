/**
 * Ticket List Screen
 * View and manage support tickets with pagination
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTickets } from '../../stores';
import { websocketService } from '../../services/websocket/WebSocketService';
import ScreenBackground from '../../components/common/ScreenBackground';
import { format } from 'date-fns';
import { TicketModel } from '../../stores/TicketStore';
import { Instance } from 'mobx-state-tree';

// Priority colors
const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#52c41a',
  MEDIUM: '#1890ff',
  HIGH: '#fa8c16',
  URGENT: '#ff4d4f',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

type TicketItem = Instance<typeof TicketModel>;

const TicketListScreen = observer(() => {
  const ticketStore = useTickets();
  const navigation = useNavigation<any>();

  // Fetch on mount & tab focus
  useFocusEffect(
    useCallback(() => {
      ticketStore.fetchTickets();
    }, [ticketStore]),
  );

  // Reload when app returns to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        ticketStore.fetchTickets();
      }
    };
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, [ticketStore]);

  // WebSocket: reload on reconnect
  useEffect(() => {
    const unsubscribe = websocketService.subscribe(message => {
      if (message.type === 'ws_reconnected') {
        ticketStore.fetchTickets();
      }
    });
    return unsubscribe;
  }, [ticketStore]);

  // Reload when status filter changes
  useEffect(() => {
    ticketStore.fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketStore.statusFilter]);

  const handleStatusChange = (status: string) => {
    ticketStore.setStatusFilter(status);
  };

  const handleLoadMore = () => {
    if (ticketStore.hasMore && !ticketStore.loadingMore) {
      ticketStore.loadMore();
    }
  };

  const onRefresh = () => {
    ticketStore.refresh();
  };

  const renderTicketCard = ({ item }: { item: TicketItem }) => {
    const priorityColor = PRIORITY_COLORS[item.priority] || '#888';
    const createdDate = item.createdAt
      ? format(new Date(item.createdAt), 'MMM dd, yyyy')
      : '';

    const statusBg =
      item.status === 'open' || item.status === 'new'
        ? '#fff7e6'
        : item.status === 'closed'
        ? '#f6ffed'
        : item.status === 'resolved'
        ? '#e6f7ff'
        : '#f5f5f5';

    const statusColor =
      item.status === 'open' || item.status === 'new'
        ? '#fa8c16'
        : item.status === 'closed'
        ? '#52c41a'
        : item.status === 'resolved'
        ? '#1890ff'
        : '#888';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('TicketDetail', { ticketId: item.id })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View
              style={[styles.priorityDot, { backgroundColor: priorityColor }]}
            />
            <Text style={styles.ticketTitle} numberOfLines={1}>
              {item.summary}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.ticketDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <View style={styles.priorityTag}>
              <Icon
                name="flag"
                size={12}
                color={priorityColor}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.priorityLabel, { color: priorityColor }]}>
                {PRIORITY_LABELS[item.priority] || item.priority}
              </Text>
            </View>

            {item.assigneeName && (
              <View style={styles.assigneeTag}>
                <Icon
                  name="person"
                  size={12}
                  color="#888"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.assigneeLabel} numberOfLines={1}>
                  {item.assigneeName}
                </Text>
              </View>
            )}

            {item.customerName && (
              <View style={styles.assigneeTag}>
                <Icon
                  name="people"
                  size={12}
                  color="#888"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.assigneeLabel} numberOfLines={1}>
                  {item.customerName}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.footerRight}>
            <Icon name="calendar-outline" size={12} color="#aaa" />
            <Text style={styles.dateText}>{createdDate}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!ticketStore.loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#1890ff" />
        <Text style={styles.footerLoaderText}>Loading more...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (ticketStore.loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Icon name="ticket-outline" size={64} color="#ddd" />
        <Text style={styles.emptyTitle}>No Tickets Found</Text>
        <Text style={styles.emptySubtitle}>
          {ticketStore.statusFilter === 'ALL'
            ? 'No support tickets have been created yet'
            : `No ${ticketStore.statusFilter} tickets found`}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenBackground>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tickets</Text>
          <Text style={styles.headerSubtitle}>
            {ticketStore.totalCount} ticket
            {ticketStore.totalCount !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Status Filter Tabs */}
        <View style={styles.tabsContainer}>
          {ticketStore.statusFilters.map(item => {
            const isActive = ticketStore.statusFilter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => handleStatusChange(item.key)}
              >
                <Text
                  style={[styles.tabText, isActive && styles.tabTextActive]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Loading */}
        {ticketStore.loading ? (
          <View style={styles.centerContainer}>
            <Text style={styles.loadingText}>Loading tickets...</Text>
          </View>
        ) : (
          <FlatList
            data={ticketStore.filteredTickets as unknown as TicketItem[]}
            keyExtractor={item => item.id}
            renderItem={renderTicketCard}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            contentContainerStyle={
              ticketStore.filteredTickets.length === 0
                ? styles.emptyListContent
                : styles.listContent
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            refreshControl={
              <RefreshControl
                refreshing={ticketStore.refreshing}
                onRefresh={onRefresh}
                colors={['#1890ff']}
                tintColor="#1890ff"
              />
            }
          />
        )}
      </View>
      </ScreenBackground>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  // Filter tabs (matches Conversations design)
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#1890ff',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  tabTextActive: {
    color: '#fff',
  },
  // Loading
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f9',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
  },
  // List
  listContent: {
    padding: 12,
    gap: 10,
    paddingBottom: 20,
  },
  emptyListContent: {
    flexGrow: 1,
    padding: 12,
  },
  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
    flexShrink: 0,
  },
  ticketTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ticketDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  priorityTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  assigneeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  assigneeLabel: {
    fontSize: 12,
    color: '#888',
    maxWidth: 100,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#aaa',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#888',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 8,
  },
  // Footer loader
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 13,
    color: '#888',
  },
});

export default TicketListScreen;
