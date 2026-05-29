/**
 * Contact Tickets Screen
 * Shows all tickets for a specific contact
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

interface RouteParams {
  contactId: string;
  contactName: string;
  tickets: Ticket[];
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#1890ff',
  IN_PROGRESS: '#fa8c16',
  RESOLVED: '#52c41a',
  CLOSED: '#8c8c8c',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#52c41a',
  MEDIUM: '#fa8c16',
  HIGH: '#ff4d4f',
  URGENT: '#cf1322',
};

const ContactTicketsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { contactId, contactName, tickets } = route.params as RouteParams;

  const handleTicketPress = (ticketId: string) => {
    // TODO: Navigate to ticket detail screen when implemented
    console.log('Open ticket:', ticketId);
  };

  const renderTicket = ({ item }: { item: Ticket }) => {
    const date = new Date(item.createdAt).toLocaleDateString();
    const statusColor = STATUS_COLORS[item.status] || '#d9d9d9';
    const priorityColor = PRIORITY_COLORS[item.priority] || '#d9d9d9';

    return (
      <TouchableOpacity
        style={styles.ticketCard}
        onPress={() => handleTicketPress(item.id)}
        activeOpacity={0.7}>
        <View style={styles.ticketHeader}>
          <Text style={styles.ticketNumber}>#{item.ticketNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.ticketSubject}>{item.subject}</Text>

        <View style={styles.ticketMeta}>
          <View style={[styles.priorityBadge, { borderColor: priorityColor }]}>
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {item.priority}
            </Text>
          </View>
          <Text style={styles.categoryText}>📂 {item.category}</Text>
        </View>

        <Text style={styles.dateText}>Created: {date}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ticket History</Text>
          <Text style={styles.headerSubtitle}>{contactName}</Text>
        </View>

        <FlatList
          data={tickets}
          renderItem={renderTicket}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎫</Text>
              <Text style={styles.emptyText}>No tickets found</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f9',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  ticketCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    lineHeight: 22,
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 12,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default ContactTicketsScreen;
