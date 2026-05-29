/**
 * ChatStore - MobX State Tree
 * Manages conversations and messages
 * Matches web admin patterns from apps/admin/src/stores/ChatStore.ts
 */

import { types, flow, Instance, cast } from 'mobx-state-tree';
import { chatService, ChatMessage as ChatMessageType } from '../services/api/chat.service';
import { websocketService } from '../services/websocket/WebSocketService';

// Message model (matches web admin)
export const ChatMessage = types.model('ChatMessage', {
  id: types.identifier,
  role: types.enumeration(['user', 'assistant', 'system']),
  senderType: types.enumeration(['visitor', 'bot', 'agent']),
  senderName: types.maybeNull(types.string),
  content: types.string,
  createdAt: types.string,
  agentMemberId: types.maybeNull(types.string),
  // Attachment fields for media messages
  attachmentType: types.maybeNull(types.string),
  attachmentUrl: types.maybeNull(types.string),
  attachmentMimeType: types.maybeNull(types.string),
  attachmentSize: types.maybeNull(types.number),
  transcription: types.maybeNull(types.string),
});

// Assigned agent model
export const AssignedAgent = types.model('AssignedAgent', {
  id: types.string,
  name: types.string,
});

// Conversation preview (list view)
export const ConversationPreview = types.model('ConversationPreview', {
  id: types.identifier,
  visitorId: types.string,
  domain: types.string,
  mode: types.enumeration(['AI_ACTIVE', 'HUMAN_TAKEOVER', 'AI_PAUSED']),
  status: types.optional(types.enumeration(['OPEN', 'CLOSED', 'ARCHIVED']), 'OPEN'),
  unreadCount: types.number,
  closedAt: types.maybeNull(types.string),
  aiOfferedHumanAgent: types.optional(types.boolean, false),
  requiresAttention: types.optional(types.boolean, false),
  suggestedAgentName: types.maybeNull(types.string),
  assignedToMemberId: types.maybeNull(types.string),
  assignedToMember: types.maybeNull(AssignedAgent),
  createdAt: types.string,
  updatedAt: types.string,
  messages: types.optional(types.array(ChatMessage), []),
})
  .views((self) => ({
    get lastMessage() {
      if (self.messages.length === 0) return null;
      return self.messages[self.messages.length - 1];
    },
    get customerName() {
      // WhatsApp format: check if domain is 'whatsapp'
      if (self.domain === 'whatsapp') {
        // Return phone number formatted nicely
        return `WhatsApp ${self.visitorId}`;
      }
      
      // Widget format: Extract visitor name from visitorId or use first message sender
      if (self.messages.length > 0 && self.messages[0].senderName) {
        return self.messages[0].senderName;
      }
      
      // Fallback: "Website Visitor [ID]"
      const visitorCode = self.visitorId.split('_')[1] || self.visitorId.substring(0, 6).toUpperCase();
      return `Website Visitor ${visitorCode}`;
    },
    get displayTitle() {
      // For conversation title in list
      return `${this.customerName}`;
    },
  }));

// Conversation detail (full conversation)
export const ConversationDetail = types.model('ConversationDetail', {
  id: types.identifier,
  visitorId: types.string,
  domain: types.string,
  mode: types.enumeration(['AI_ACTIVE', 'HUMAN_TAKEOVER', 'AI_PAUSED']),
  unreadCount: types.number,
  assignedToMemberId: types.maybeNull(types.string),
  assignedToMember: types.maybeNull(AssignedAgent),
  createdAt: types.string,
  updatedAt: types.string,
  messages: types.array(ChatMessage),
});

// ChatStore (matches web admin patterns)
export const ChatStore = types
  .model('ChatStore', {
    conversations: types.array(ConversationPreview),
    selectedChatId: types.maybeNull(types.string),
    conversationDetail: types.maybeNull(ConversationDetail),
    chatStatus: types.optional(types.enumeration(['OPEN', 'CLOSED', 'ARCHIVED']), 'OPEN'),
    
    // Agent status
    currentAgentStatus: types.maybeNull(types.enumeration(['ONLINE', 'OFFLINE', 'BUSY', 'AWAY'])),

    // Loading states
    isLoading: types.optional(types.boolean, false),
    isDetailLoading: types.optional(types.boolean, false),
    isReplyLoading: types.optional(types.boolean, false),
    isUpdatingMode: types.optional(types.boolean, false),
    isStatusLoading: types.optional(types.boolean, false),

    // UI states
    aiTypingConversationIds: types.array(types.string),
    visitorTypingConversationIds: types.array(types.string),

    error: types.maybeNull(types.string),
  })
  .views((self) => ({
    get selectedConversation() {
      if (!self.selectedChatId) return null;
      return self.conversations.find((c) => c.id === self.selectedChatId);
    },
    get unreadChatsCount() {
      return self.conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
    },
    get escalationCount() {
      // Count conversations that require attention
      return self.conversations.filter((conv) => conv.requiresAttention === true).length;
    },
    get claimedChatsCount() {
      // Count conversations assigned to current agent
      return self.conversations.filter((conv) => conv.assignedToMemberId !== null).length;
    },
    get aiDisabledCount() {
      return self.conversations.filter((conv) => conv.mode !== 'AI_ACTIVE').length;
    },
    isAiTyping(conversationId: string) {
      return self.aiTypingConversationIds.includes(conversationId);
    },
    isVisitorTyping(conversationId: string) {
      return self.visitorTypingConversationIds.includes(conversationId);
    },
    // For compatibility with mobile UI
    get sortedConversations() {
      return self.conversations.slice().sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    },
  }))
  .volatile(() => ({
    websocketUnsubscribe: null as (() => void) | null,
  }))
  .actions((self) => {
    const loadConversations = flow(function* (status?: 'OPEN' | 'CLOSED' | 'ARCHIVED') {
      console.log('🔄 ChatStore.loadConversations() - START');
      self.isLoading = true;
      self.error = null;

      try {
        const filterStatus = status || self.chatStatus;
        const data = yield chatService.getConversations(filterStatus);
        
        self.conversations = cast(data);
        console.log('✅ ChatStore.loadConversations() - Success:', data.length, 'conversations');
      } catch (error: any) {
        self.error = error.message || 'Failed to load conversations';
        console.error('❌ ChatStore.loadConversations() - Error:', error);
      } finally {
        self.isLoading = false;
      }
    });

    const loadConversationDetail = flow(function* (chatId: string) {
      console.log('🔄 ChatStore.loadConversationDetail() - START:', chatId);
      self.isDetailLoading = true;
      self.error = null;

      try {
        const conversation = yield chatService.getConversationById(chatId);
        
        // Update conversationDetail
        self.conversationDetail = cast(conversation);
        
        // Zero out the unread badge in the conversations list
        const conv = self.conversations.find((c) => c.id === chatId);
        if (conv) {
          conv.unreadCount = 0;
        }
        
        console.log('✅ ChatStore.loadConversationDetail() - Success:', conversation.messages.length, 'messages');
      } catch (error: any) {
        self.error = error.message || 'Failed to load conversation';
        console.error('❌ ChatStore.loadConversationDetail() - Error:', error);
      } finally {
        self.isDetailLoading = false;
      }
    });

    const sendReply = flow(function* (chatId: string, content: string, agentId: string) {
      console.log('📤 ChatStore.sendReply() - START');
      self.isReplyLoading = true;
      self.error = null;

      try {
        yield chatService.sendReply(chatId, content, agentId);
        
        // Reload conversation detail to get the new message
        yield loadConversationDetail(chatId);
        yield loadConversations();
        
        console.log('✅ ChatStore.sendReply() - Success');
      } catch (error: any) {
        self.error = error.message || 'Failed to send reply';
        console.error('❌ ChatStore.sendReply() - Error:', error);
        throw error;
      } finally {
        self.isReplyLoading = false;
      }
    });

    const updateConversationMode = flow(function* (chatId: string, mode: 'AI_ACTIVE' | 'HUMAN_TAKEOVER' | 'AI_PAUSED') {
      console.log('🔄 ChatStore.updateConversationMode() - mode:', mode);
      self.isUpdatingMode = true;
      self.error = null;

      try {
        yield chatService.updateMode(chatId, mode);
        
        // Reload conversations and detail
        yield loadConversationDetail(chatId);
        yield loadConversations();
        
        console.log('✅ ChatStore.updateConversationMode() - Success');
      } catch (error: any) {
        self.error = error.message || 'Failed to update conversation mode';
        console.error('❌ ChatStore.updateConversationMode() - Error:', error);
        throw error;
      } finally {
        self.isUpdatingMode = false;
      }
    });

    const claimConversation = flow(function* (conversationId: string) {
      console.log('🔄 ChatStore.claimConversation() - conversationId:', conversationId);
      self.isUpdatingMode = true;
      self.error = null;

      try {
        yield chatService.claimConversation(conversationId);
        
        // Reload conversations and detail
        yield loadConversationDetail(conversationId);
        yield loadConversations();
        
        console.log('✅ ChatStore.claimConversation() - Success');
      } catch (error: any) {
        self.error = error.message || 'Failed to claim conversation';
        console.error('❌ ChatStore.claimConversation() - Error:', error);
        throw error;
      } finally {
        self.isUpdatingMode = false;
      }
    });

    const releaseConversation = flow(function* (conversationId: string) {
      console.log('🔄 ChatStore.releaseConversation() - conversationId:', conversationId);
      self.isUpdatingMode = true;
      self.error = null;

      try {
        yield chatService.releaseConversation(conversationId);
        
        // Reload conversations and detail
        yield loadConversationDetail(conversationId);
        yield loadConversations();
        
        console.log('✅ ChatStore.releaseConversation() - Success');
      } catch (error: any) {
        self.error = error.message || 'Failed to release conversation';
        console.error('❌ ChatStore.releaseConversation() - Error:', error);
        throw error;
      } finally {
        self.isUpdatingMode = false;
      }
    });

    const closeConversation = flow(function* (conversationId: string) {
      console.log('🔄 ChatStore.closeConversation() - conversationId:', conversationId);
      self.isUpdatingMode = true;
      self.error = null;

      try {
        yield chatService.closeConversation(conversationId);
        
        // Reload conversations
        yield loadConversations();
        
        // Clear selected conversation if it was the closed one
        if (self.selectedChatId === conversationId) {
          self.selectedChatId = null;
          self.conversationDetail = null;
        }
        
        console.log('✅ ChatStore.closeConversation() - Success');
      } catch (error: any) {
        self.error = error.message || 'Failed to close conversation';
        console.error('❌ ChatStore.closeConversation() - Error:', error);
        throw error;
      } finally {
        self.isUpdatingMode = false;
      }
    });

    const updateAgentStatus = flow(function* (status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'AWAY') {
      console.log('🔄 ChatStore.updateAgentStatus() - status:', status);
      self.isStatusLoading = true;
      self.error = null;

      try {
        yield chatService.updateAgentStatus(status);
        self.currentAgentStatus = status;
        
        console.log('✅ ChatStore.updateAgentStatus() - Success');
      } catch (error: any) {
        self.error = error.message || 'Failed to update status';
        console.error('❌ ChatStore.updateAgentStatus() - Error:', error);
        throw error;
      } finally {
        self.isStatusLoading = false;
      }
    });

    const fetchAgentStatus = flow(function* () {
      console.log('🔄 ChatStore.fetchAgentStatus() - START');
      self.isStatusLoading = true;
      self.error = null;

      try {
        const data = yield chatService.getAgentsWithStatus();
        self.currentAgentStatus = data.currentStatus as 'ONLINE' | 'OFFLINE' | 'BUSY' | 'AWAY';
        
        console.log('✅ ChatStore.fetchAgentStatus() - Status:', data.currentStatus);
      } catch (error: any) {
        self.error = error.message || 'Failed to fetch status';
        console.error('❌ ChatStore.fetchAgentStatus() - Error:', error);
        // Default to OFFLINE if fetch fails
        self.currentAgentStatus = 'OFFLINE';
      } finally {
        self.isStatusLoading = false;
      }
    });

    const selectChat = (chatId: string | null) => {
      self.selectedChatId = chatId;
      if (chatId) {
        loadConversationDetail(chatId);
      } else {
        self.conversationDetail = null;
      }
    };

    const setChatStatus = flow(function* (status: 'OPEN' | 'CLOSED' | 'ARCHIVED') {
      self.chatStatus = status;
      yield loadConversations(status);
    });

    const addAiTyping = (conversationId: string) => {
      if (!self.aiTypingConversationIds.includes(conversationId)) {
        self.aiTypingConversationIds.push(conversationId);
      }
    };

    const removeAiTyping = (conversationId: string) => {
      const index = self.aiTypingConversationIds.indexOf(conversationId);
      if (index > -1) {
        self.aiTypingConversationIds.splice(index, 1);
      }
    };

    const addVisitorTyping = (conversationId: string) => {
      if (!self.visitorTypingConversationIds.includes(conversationId)) {
        self.visitorTypingConversationIds.push(conversationId);
      }
    };

    const removeVisitorTyping = (conversationId: string) => {
      const index = self.visitorTypingConversationIds.indexOf(conversationId);
      if (index > -1) {
        self.visitorTypingConversationIds.splice(index, 1);
      }
    };

    const addMessage = (conversationId: string, message: ChatMessageType) => {
      // Update conversationDetail if it's the selected conversation
      if (self.conversationDetail && self.conversationDetail.id === conversationId) {
        self.conversationDetail.messages.push(cast(message));
        self.conversationDetail.updatedAt = new Date().toISOString();
      }

      // Update conversation in list
      const conversation = self.conversations.find((c) => c.id === conversationId);
      if (conversation) {
        conversation.messages.push(cast(message));
        conversation.updatedAt = new Date().toISOString();
        
        // Increment unread count if not currently viewing this conversation
        if (self.selectedChatId !== conversationId) {
          conversation.unreadCount += 1;
        }
      }
    };

    const clearError = () => {
      self.error = null;
    };

    const disconnectWebSocket = () => {
      console.log('🔌 ChatStore.disconnectWebSocket()');
      
      if (self.websocketUnsubscribe) {
        self.websocketUnsubscribe();
        self.websocketUnsubscribe = null;
      }
      
      websocketService.disconnect();
    };

    return {
      loadConversations,
      loadConversationDetail,
      sendReply,
      updateConversationMode,
      claimConversation,
      releaseConversation,
      closeConversation,
      updateAgentStatus,
      fetchAgentStatus,
      selectChat,
      setChatStatus,
      addAiTyping,
      removeAiTyping,
      addVisitorTyping,
      removeVisitorTyping,
      addMessage,
      clearError,
      disconnectWebSocket,
    };
  })
  .actions((self) => ({
    // WebSocket message handler - separate action to ensure proper MST context
    handleWebSocketUpdate(message: any) {
      console.log('📨 WebSocket message received:', message.type);
      
      try {
        switch (message.type) {
          case 'conversation_updated':
            if (message.newMessage && message.conversation) {
              self.addMessage(message.conversation.id, message.newMessage);
              self.loadConversations().catch((err: any) => console.error('Failed to reload:', err));
            }
            break;
          
          case 'conversation_mode_updated':
            if (message.conversationId) {
              self.loadConversations().catch((err: any) => console.error('Failed to reload:', err));
              if (self.selectedChatId === message.conversationId) {
                self.loadConversationDetail(message.conversationId).catch((err: any) => console.error('Failed to reload detail:', err));
              }
            }
            break;
          
          case 'typing_start':
            if (message.conversationId) {
              if (message.source === 'ai') {
                self.addAiTyping(message.conversationId);
              } else if (message.source === 'visitor') {
                self.addVisitorTyping(message.conversationId);
              }
            }
            break;
          
          case 'typing_stop':
            if (message.conversationId) {
              if (message.source === 'ai') {
                self.removeAiTyping(message.conversationId);
              } else if (message.source === 'visitor') {
                self.removeVisitorTyping(message.conversationId);
              }
            }
            break;
          
          case 'escalation_request':
            if (message.conversationId) {
              self.loadConversations().catch((err: any) => console.error('Failed to reload:', err));
            }
            break;
          
          default:
            console.log('Unknown WebSocket message type:', (message as any).type);
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    },
  }))
  .actions((self) => ({
    // WebSocket connection - uses handleWebSocketUpdate action
    setupWebSocketConnection(apiBaseUrl: string, token: string) {
      console.log('🔌 Setting up WebSocket connection');
      
      // Disconnect any existing connection
      if (self.websocketUnsubscribe) {
        self.websocketUnsubscribe();
        self.websocketUnsubscribe = null;
      }
      
      // Connect to WebSocket
      websocketService.connect(apiBaseUrl, token);
      
      // Subscribe with the bound action
      const unsubscribe = websocketService.subscribe((message) => {
        self.handleWebSocketUpdate(message);
      });
      
      self.websocketUnsubscribe = unsubscribe;
    },
  }));

export type IChatStore = Instance<typeof ChatStore>;
export default ChatStore;
