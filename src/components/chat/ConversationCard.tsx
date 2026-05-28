/**
 * ConversationCard Component
 * Displays a single conversation in the list with actions
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { format } from 'date-fns';
import { observer } from 'mobx-react-lite';
import { useAuth, useChat } from '../../stores';

interface ConversationCardProps {
  conversation: {
    id: string;
    customerName: string; // Computed property
    displayTitle: string; // Computed property
    lastMessage: { content: string; attachmentType: string | null } | null;
    updatedAt: string;
    unreadCount: number;
    status: 'OPEN' | 'CLOSED' | 'ARCHIVED';
    mode: 'AI_ACTIVE' | 'HUMAN_TAKEOVER' | 'AI_PAUSED';
    requiresAttention: boolean;
    assignedToMemberId: string | null;
    assignedToMember: { id: string; name: string } | null;
  };
  onPress: () => void;
}

const ConversationCard: React.FC<ConversationCardProps> = observer(({ conversation, onPress }) => {
  const authStore = useAuth();
  const chatStore = useChat();

  const getStatusColor = (status: 'OPEN' | 'CLOSED' | 'ARCHIVED') => {
    switch (status) {
      case 'OPEN':
        return '#52c41a';
      case 'CLOSED':
        return '#999';
      case 'ARCHIVED':
        return '#666';
      default:
        return '#999';
    }
  };

  const getModeIcon = (mode: 'AI_ACTIVE' | 'HUMAN_TAKEOVER' | 'AI_PAUSED') => {
    switch (mode) {
      case 'HUMAN_TAKEOVER':
        return '👤';
      case 'AI_PAUSED':
        return '⏸️';
      default:
        return '🤖';
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

  const formatLastMessage = () => {
    if (!conversation.lastMessage) return 'No messages yet';
    
    if (conversation.lastMessage.attachmentType === 'audio') {
      return '🎤 Voice message';
    }
    
    if (conversation.lastMessage.attachmentType === 'image') {
      return '🖼️ Image';
    }
    
    return conversation.lastMessage.content || 'No messages yet';
  };

  const handleToggleAI = async () => {
    try {
      const newMode = conversation.mode === 'AI_ACTIVE' ? 'HUMAN_TAKEOVER' : 'AI_ACTIVE';
      await chatStore.updateConversationMode(conversation.id, newMode);
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle AI');
    }
  };

  const handleClaim = async () => {
    try {
      await chatStore.claimConversation(conversation.id);
      Alert.alert('Success', 'Conversation claimed!');
    } catch (error) {
      Alert.alert('Error', 'Failed to claim conversation');
    }
  };

  const isClaimedByMe = conversation.assignedToMemberId === authStore.memberId;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} testID="conversation-card">
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.customerName} numberOfLines={1}>
            {conversation.displayTitle}
          </Text>
          {conversation.requiresAttention && (
            <View style={styles.attentionBadge}>
              <Text style={styles.attentionIcon}>⚠️</Text>
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(conversation.status) }]}>
            <Text style={styles.statusText}>{conversation.status}</Text>
          </View>
        </View>
        <Text style={styles.time}>{formatTime(conversation.updatedAt)}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.modeIcon}>{getModeIcon(conversation.mode)}</Text>
        <Text style={styles.lastMessage} numberOfLines={2}>
          {formatLastMessage()}
        </Text>
      </View>

      {conversation.assignedToMemberId && (
        <View style={styles.claimStatus}>
          <Text style={styles.claimIcon}>👤</Text>
          <Text style={styles.claimText}>
            {isClaimedByMe
              ? 'Claimed by you'
              : `Claimed by ${conversation.assignedToMember?.name || 'Agent'}`}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            conversation.mode === 'AI_ACTIVE' ? styles.aiActiveButton : styles.aiInactiveButton,
          ]}
          onPress={handleToggleAI}
          disabled={chatStore.isUpdatingMode}>
          <Text style={styles.actionButtonText}>
            {conversation.mode === 'AI_ACTIVE' ? '🤖 AI On' : '👤 Manual'}
          </Text>
        </TouchableOpacity>

        {!conversation.assignedToMemberId && (
          <TouchableOpacity
            style={[styles.actionButton, styles.claimButton]}
            onPress={handleClaim}
            disabled={chatStore.isUpdatingMode}>
            <Text style={styles.actionButtonText}>🙋 Claim</Text>
          </TouchableOpacity>
        )}

        {isClaimedByMe && (
          <TouchableOpacity
            style={[styles.actionButton, styles.releaseButton]}
            onPress={async () => {
              try {
                await chatStore.releaseConversation(conversation.id);
              } catch (error) {
                Alert.alert('Error', 'Failed to release conversation');
              }
            }}
            disabled={chatStore.isUpdatingMode}>
            <Text style={styles.actionButtonText}>↩️ Release</Text>
          </TouchableOpacity>
        )}
      </View>

      {conversation.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{conversation.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

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
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
    flex: 1,
  },
  attentionBadge: {
    marginRight: 4,
  },
  attentionIcon: {
    fontSize: 16,
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
    marginBottom: 8,
  },
  modeIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  claimStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  claimIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  claimText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  aiActiveButton: {
    backgroundColor: '#e6f7ff',
    borderColor: '#1890ff',
  },
  aiInactiveButton: {
    backgroundColor: '#fff7e6',
    borderColor: '#fa8c16',
  },
  claimButton: {
    backgroundColor: '#f6ffed',
    borderColor: '#52c41a',
  },
  releaseButton: {
    backgroundColor: '#fff1f0',
    borderColor: '#ff4d4f',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  unreadBadge: {
    position: 'absolute',
    right: 15,
    top: 15,
    backgroundColor: '#1890ff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ConversationCard;
