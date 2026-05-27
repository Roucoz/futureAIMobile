/**
 * ChatStore - MobX State Tree
 * Manages conversations and messages
 */

import { types, flow, Instance } from 'mobx-state-tree';
import { chatService } from '../services/api/chat.service';

// Message model
export const MessageModel = types.model('Message', {
  id: types.identifier,
  conversationId: types.string,
  text: types.maybeNull(types.string),
  sender: types.enumeration(['CUSTOMER', 'AGENT', 'AI']),
  timestamp: types.string,
  status: types.optional(
    types.enumeration(['SENDING', 'SENT', 'DELIVERED', 'FAILED']),
    'SENT'
  ),
  mediaUrl: types.maybeNull(types.string),
  mediaType: types.maybeNull(types.string),
  isRead: types.optional(types.boolean, false),
});

// Conversation model
export const ConversationModel = types.model('Conversation', {
  id: types.identifier,
  customerId: types.string,
  customerName: types.string,
  customerPhone: types.maybeNull(types.string),
  customerEmail: types.maybeNull(types.string),
  status: types.enumeration(['OPEN', 'IN_PROGRESS', 'CLOSED']),
  lastMessage: types.maybeNull(types.string),
  lastMessageAt: types.maybeNull(types.string),
  unreadCount: types.optional(types.number, 0),
  assignedToId: types.maybeNull(types.string),
  assignedToName: types.maybeNull(types.string),
  channel: types.optional(types.enumeration(['WIDGET', 'WHATSAPP', 'EMAIL']), 'WIDGET'),
});

// ChatStore
export const ChatStore = types
  .model('ChatStore', {
    conversations: types.array(ConversationModel),
    messages: types.map(types.array(MessageModel)), // conversationId -> messages[]
    selectedConversationId: types.maybeNull(types.string),
    loading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
  })
  .actions((self) => ({
    /**
     * Load all conversations
     */
    loadConversations: flow(function* () {
      self.loading = true;
      self.error = null;

      try {
        const data = yield chatService.getConversations();
        self.conversations.replace(data);
      } catch (error: any) {
        self.error = error.message || 'Failed to load conversations';
        console.error('Failed to load conversations:', error);
      } finally {
        self.loading = false;
      }
    }),

    /**
     * Load messages for a conversation
     */
    loadMessages: flow(function* (conversationId: string) {
      self.loading = true;
      self.error = null;

      try {
        const data = yield chatService.getMessages(conversationId);
        self.messages.set(conversationId, data);
      } catch (error: any) {
        self.error = error.message || 'Failed to load messages';
        console.error('Failed to load messages:', error);
      } finally {
        self.loading = false;
      }
    }),

    /**
     * Send a message
     */
    sendMessage: flow(function* (conversationId: string, text: string) {
      try {
        const newMessage = yield chatService.sendMessage(conversationId, text);
        
        // Add message to local state
        const messages = self.messages.get(conversationId) || [];
        self.messages.set(conversationId, [...messages, newMessage]);

        // Update conversation's last message
        const conversation = self.conversations.find((c) => c.id === conversationId);
        if (conversation) {
          conversation.lastMessage = text;
          conversation.lastMessageAt = newMessage.timestamp;
        }

        return newMessage;
      } catch (error: any) {
        self.error = error.message || 'Failed to send message';
        console.error('Failed to send message:', error);
        throw error;
      }
    }),

    /**
     * Add new message (from WebSocket)
     */
    addMessage(message: any) {
      const messages = self.messages.get(message.conversationId) || [];
      self.messages.set(message.conversationId, [...messages, message]);

      // Update conversation
      const conversation = self.conversations.find((c) => c.id === message.conversationId);
      if (conversation) {
        conversation.lastMessage = message.text;
        conversation.lastMessageAt = message.timestamp;
        
        // Increment unread count if not currently viewing this conversation
        if (self.selectedConversationId !== message.conversationId) {
          conversation.unreadCount += 1;
        }
      }
    },

    /**
     * Mark conversation as read
     */
    markAsRead: flow(function* (conversationId: string) {
      try {
        yield chatService.markAsRead(conversationId);
        
        const conversation = self.conversations.find((c) => c.id === conversationId);
        if (conversation) {
          conversation.unreadCount = 0;
        }
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }),

    /**
     * Update conversation status
     */
    updateConversationStatus: flow(function* (conversationId: string, status: string) {
      try {
        yield chatService.updateConversationStatus(conversationId, status);
        
        const conversation = self.conversations.find((c) => c.id === conversationId);
        if (conversation) {
          conversation.status = status as any;
        }
      } catch (error: any) {
        self.error = error.message || 'Failed to update status';
        throw error;
      }
    }),

    /**
     * Set selected conversation
     */
    selectConversation(conversationId: string | null) {
      self.selectedConversationId = conversationId;
      
      if (conversationId) {
        // Mark as read when opening
        this.markAsRead(conversationId);
      }
    },

    /**
     * Clear error
     */
    clearError() {
      self.error = null;
    },
  }))
  .views((self) => ({
    /**
     * Get messages for selected conversation
     */
    get selectedConversationMessages() {
      if (!self.selectedConversationId) return [];
      return self.messages.get(self.selectedConversationId) || [];
    },

    /**
     * Get selected conversation
     */
    get selectedConversation() {
      if (!self.selectedConversationId) return null;
      return self.conversations.find((c) => c.id === self.selectedConversationId);
    },

    /**
     * Get total unread count
     */
    get totalUnreadCount() {
      return self.conversations.reduce((sum, c) => sum + c.unreadCount, 0);
    },

    /**
     * Get conversations sorted by last message time
     */
    get sortedConversations() {
      return self.conversations.slice().sort((a, b) => {
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return timeB - timeA;
      });
    },
  }));

export type IChatStore = Instance<typeof ChatStore>;
export default ChatStore;
