/**
 * ConversationCard Component
 * Displays a single conversation in the list
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { format } from 'date-fns';

interface ConversationCardProps {
  conversation: {
    id: string;
    customerName: string;
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount: number;
    status: string;
    channel: string;
  };
  onPress: () => void;
}

const ConversationCard: React.FC<ConversationCardProps> = ({ conversation, onPress }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return '#52c41a';
      case 'IN_PROGRESS':
        return '#faad14';
      case 'CLOSED':
        return '#999';
      default:
        return '#999';
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'WHATSAPP':
        return '💬';
      case 'EMAIL':
        return '📧';
      default:
        return '🌐';
    }
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return format(date, 'HH:mm');
    } else {
      return format(date, 'MMM dd');
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      testID="conversation-card">
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.customerName}>{conversation.customerName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(conversation.status) }]}>
            <Text style={styles.statusText}>{conversation.status}</Text>
          </View>
        </View>
        <Text style={styles.time}>{formatTime(conversation.lastMessageAt)}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.channelIcon}>{getChannelIcon(conversation.channel)}</Text>
        <Text style={styles.lastMessage} numberOfLines={2}>
          {conversation.lastMessage || 'No messages yet'}
        </Text>
      </View>

      {conversation.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{conversation.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  unreadBadge: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    backgroundColor: '#1890ff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ConversationCard;
