/**
 * Contacts Screen
 * Customer directory with pagination, sorting, and quick actions
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ContactsStackParamList } from '../../navigation/types';
import contactService, { Contact, GetContactsParams } from '../../services/api/contact.service';

type NavigationProp = StackNavigationProp<ContactsStackParamList, 'ContactsList'>;

const ContactsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<'lastContactedAt' | 'name' | 'totalConversations'>('lastContactedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<'ALL' | 'NEW' | 'RETURNING' | 'VIP'>('ALL');

  // Load contacts
  const loadContacts = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (!append) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const params: GetContactsParams = {
        page: pageNum,
        pageSize: 20,
        sortBy,
        sortOrder,
        ...(searchQuery && { search: searchQuery }),
        ...(filterType !== 'ALL' && { customerType: filterType }),
      };

      const response = await contactService.getContacts(params);
      
      if (append) {
        setContacts(prev => [...prev, ...response.contacts]);
      } else {
        setContacts(response.contacts);
      }
      
      setPage(pageNum);
      setTotalPages(response.totalPages);
    } catch (error: any) {
      console.error('Failed to load contacts:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to load contacts');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [sortBy, sortOrder, searchQuery, filterType]);

  // Initial load
  useEffect(() => {
    loadContacts(1, false);
  }, [sortBy, sortOrder, filterType]);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== undefined) {
        loadContacts(1, false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadContacts(1, false);
  };

  // Load more (pagination)
  const handleLoadMore = () => {
    if (!isLoadingMore && page < totalPages) {
      loadContacts(page + 1, true);
    }
  };

  // Open contact detail screen
  const handleContactPress = (contact: Contact) => {
    navigation.navigate('ContactDetail', { contact });
  };

  // Start new conversation
  const handleStartConversation = async (contact: Contact) => {
    try {
      const { conversationId } = await contactService.startConversation(contact.phoneNumber);
      // Navigate to ChatStack in parent navigator
      (navigation as any).navigate('ChatStack', {
        screen: 'ChatDetail',
        params: { conversationId },
      });
    } catch (error: any) {
      console.error('Failed to start conversation:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to start conversation');
    }
  };

  // Create ticket for contact
  const handleCreateTicket = async (contact: Contact) => {
    try {
      // First, check if there's an existing open conversation
      const conversations = await contactService.getContactConversations(contact.id, contact.phoneNumber);
      
      let conversationId;
      if (conversations.length > 0) {
        // Use the most recent open conversation
        const openConv = conversations.find((c: any) => c.status === 'OPEN');
        conversationId = openConv ? openConv.id : conversations[0].id;
      } else {
        // Create a new conversation
        const result = await contactService.startConversation(contact.phoneNumber);
        conversationId = result.conversationId;
      }
      
      // Navigate to create ticket screen
      (navigation as any).navigate('ChatStack', {
        screen: 'CreateTicket',
        params: { conversationId },
      });
    } catch (error: any) {
      console.error('Failed to create ticket:', error);
      Alert.alert('Error', 'Failed to create ticket');
    }
  };

  // Toggle sort order
  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'name' ? 'asc' : 'desc');
    }
  };

  // Render contact item
  const renderContactItem = ({ item }: { item: Contact }) => {
    const displayName = item.name || item.phoneNumber;
    const lastContactDate = new Date(item.lastContactedAt).toLocaleDateString();
    const channels = item.channels.join(', ');

    return (
      <TouchableOpacity 
        style={styles.contactCard}
        onPress={() => handleContactPress(item)}
        activeOpacity={0.7}>
        <View style={styles.contactHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.contactInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.contactName}>{displayName}</Text>
              {item.isVip && (
                <View style={styles.vipBadge}>
                  <Text style={styles.vipText}>VIP</Text>
                </View>
              )}
            </View>
            <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
            {item.email && <Text style={styles.contactEmail}>{item.email}</Text>}
          </View>
        </View>

        <View style={styles.contactMeta}>
          <Text style={styles.metaText}>📱 {channels}</Text>
          <Text style={styles.metaText}>💬 {item.totalConversations} chats</Text>
          <Text style={styles.metaText}>📅 {lastContactDate}</Text>
        </View>

        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {item.tags.length > 3 && (
              <Text style={styles.moreTagsText}>+{item.tags.length - 3}</Text>
            )}
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleStartConversation(item);
            }}>
            <Text style={styles.actionButtonText}>💬 Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleCreateTicket(item);
            }}>
            <Text style={styles.actionButtonText}>🎫 Create Ticket</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (isLoading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>👥</Text>
        <Text style={styles.emptyTitle}>No Contacts Found</Text>
        <Text style={styles.emptyText}>
          {searchQuery 
            ? 'Try adjusting your search or filters'
            : 'Contacts will appear here when customers reach out'}
        </Text>
      </View>
    );
  };

  // Render footer
  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#1890ff" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Contacts</Text>
          <Text style={styles.headerSubtitle}>{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['ALL', 'NEW', 'RETURNING', 'VIP'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterTab, filterType === filter && styles.filterTabActive]}
            onPress={() => setFilterType(filter)}>
            <Text style={[styles.filterText, filterType === filter && styles.filterTextActive]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <TouchableOpacity onPress={() => toggleSort('lastContactedAt')}>
          <Text style={[styles.sortOption, sortBy === 'lastContactedAt' && styles.sortOptionActive]}>
            Recent {sortBy === 'lastContactedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => toggleSort('name')}>
          <Text style={[styles.sortOption, sortBy === 'name' && styles.sortOptionActive]}>
            Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => toggleSort('totalConversations')}>
          <Text style={[styles.sortOption, sortBy === 'totalConversations' && styles.sortOptionActive]}>
            Chats {sortBy === 'totalConversations' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contact List */}
      {isLoading && contacts.length === 0 ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="#1890ff" />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContactItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          contentContainerStyle={contacts.length === 0 ? styles.emptyList : undefined}
        />
      )}
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
    paddingBottom: 0,
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
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  searchInput: {
    height: 40,
    backgroundColor: '#f5f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f5f5f9',
  },
  filterTabActive: {
    backgroundColor: '#1890ff',
  },
  filterText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  sortLabel: {
    fontSize: 13,
    color: '#666',
    marginRight: 12,
  },
  sortOption: {
    fontSize: 13,
    color: '#666',
    marginRight: 16,
    fontWeight: '500',
  },
  sortOptionActive: {
    color: '#1890ff',
    fontWeight: '600',
  },
  contactCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  contactHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1890ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  contactInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 8,
  },
  vipBadge: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
  contactPhone: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 13,
    color: '#666',
  },
  contactMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#888',
    marginRight: 12,
    marginBottom: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#e6f7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 11,
    color: '#1890ff',
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 11,
    color: '#888',
    alignSelf: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#f5f5f9',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1890ff',
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  emptyList: {
    flexGrow: 1,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default ContactsScreen;
