/**
 * Contact Conversations Screen
 * Shows all conversations for a specific contact
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
import { StackNavigationProp } from '@react-navigation/stack';
import { ContactsStackParamList } from '../../navigation/types';

interface Conversation {
  id: string;
  status: string;
  channel: string;
  lastMessagePreview: string;
  updatedAt: string;
}

interface RouteParams {
  contactId: string;
  contactName: string;
  conversations: Conversation[];
}

type NavigationProp = StackNavigationProp<ContactsStackParamList, 'ContactConversations'>;

const ContactConversationsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { contactId, contactName, conversations } = route.params as RouteParams;

  const handleConversationPress = (conversationId: string) => {
    // Navigate to ChatStack in parent navigator
    (navigation as any).navigate('ChatStack', {
      screen: 'ChatDetail',
      params: { conversationId },
    });
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const date = new Date(item.updatedAt).toLocaleDateString();
    const time = new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <TouchableOpacity
        style={styles.conversationCard}
        onPress={() => handleConversationPress(item.id)}
        activeOpacity={0.7}>
        <View style={styles.conversationHeader}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          <Text style={styles.channelText}>📱 {item.channel}</Text>
        </View>
        <Text style={styles.messagePreview} numberOfLines={2}>
          {item.lastMessagePreview || 'No messages'}
        </Text>
        <Text style={styles.dateText}>
          {date} at {time}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat History</Text>
          <Text style={styles.headerSubtitle}>{contactName}</Text>
        </View>

        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>No conversations found</Text>
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
  conversationCard: {
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
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    backgroundColor: '#e6f7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1890ff',
  },
  channelText: {
    fontSize: 12,
    color: '#666',
  },
  messagePreview: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 8,
    lineHeight: 20,
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

export default ContactConversationsScreen;
