/**
 * Chat Service
 * API calls for conversations and messages
 */

import apiClient from './client';

export interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  assignedToId?: string;
  assignedToName?: string;
  channel: 'WIDGET' | 'WHATSAPP' | 'EMAIL';
}

export interface Message {
  id: string;
  conversationId: string;
  text?: string;
  sender: 'CUSTOMER' | 'AGENT' | 'AI';
  timestamp: string;
  status: 'SENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  mediaUrl?: string;
  mediaType?: string;
  isRead: boolean;
}

class ChatService {
  /**
   * Get all conversations
   */
  async getConversations(): Promise<Conversation[]> {
    const response = await apiClient.get('/v1/admin/chats', {
      params: { status: 'OPEN' },
    });
    const conversations = response.data.conversations || [];
    
    // Map backend format to our Conversation interface
    return conversations.map((conv: any) => {
      const lastMsg = conv.messages?.[0];
      
      return {
        id: conv.id,
        customerId: conv.visitorId,
        customerName: lastMsg?.senderName || conv.visitorId || 'Unknown',
        customerPhone: null,
        customerEmail: null,
        status: conv.status === 'CLOSED' ? 'CLOSED' : conv.status === 'ARCHIVED' ? 'CLOSED' : 'OPEN',
        lastMessage: lastMsg?.content || null,
        lastMessageAt: lastMsg?.createdAt || conv.updatedAt,
        unreadCount: conv.unreadCount || 0,
        assignedToId: conv.assignedToMember?.id || null,
        assignedToName: conv.assignedToMember?.name || null,
        channel: 'WIDGET', // Backend doesn't expose channel, default to WIDGET
      };
    });
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string): Promise<Message[]> {
    const response = await apiClient.get(`/v1/admin/chats/${conversationId}`);
    const conversation = response.data;
    
    // Map backend message format to our format
    return (conversation.messages || []).map((msg: any) => ({
      id: msg.id,
      conversationId: conversationId,
      text: msg.content,
      sender: msg.role === 'user' ? 'CUSTOMER' : msg.senderType === 'AI' ? 'AI' : 'AGENT',
      timestamp: msg.createdAt,
      status: 'SENT',
      mediaUrl: msg.attachmentUrl,
      mediaType: msg.attachmentType,
      isRead: true,
    }));
  }

  /**
   * Send a message
   */
  async sendMessage(conversationId: string, text: string): Promise<Message> {
    const response = await apiClient.post(
      `/v1/admin/chats/${conversationId}/reply`,
      { content: text }
    );
    const msg = response.data.message || response.data;
    
    return {
      id: msg.id,
      conversationId: conversationId,
      text: msg.content,
      sender: 'AGENT',
      timestamp: msg.createdAt || new Date().toISOString(),
      status: 'SENT',
      isRead: true,
    };
  }

  /**
   * Mark conversation as read
   */
  async markAsRead(conversationId: string): Promise<void> {
    // Mark as read happens automatically when fetching messages in getChatById
    // No separate endpoint needed
  }

  /**
   * Update conversation status
   */
  async updateConversationStatus(
    conversationId: string,
    status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED'
  ): Promise<void> {
    if (status === 'CLOSED') {
      await apiClient.post(`/v1/admin/chats/${conversationId}/close`);
    }
    // Backend doesn't have separate status update for OPEN/IN_PROGRESS
  }
}

export const chatService = new ChatService();
export default chatService;
