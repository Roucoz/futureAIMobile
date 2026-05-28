/**
 * Chat Service
 * API calls for conversations and messages
 * Matches web admin patterns: /v1/admin/chats endpoints
 */

import apiClient from './client';

export interface ConversationPreview {
  id: string;
  visitorId: string;
  domain: string;
  mode: 'AI_ACTIVE' | 'HUMAN_TAKEOVER' | 'AI_PAUSED';
  status: 'OPEN' | 'CLOSED' | 'ARCHIVED';
  unreadCount: number;
  closedAt: string | null;
  aiOfferedHumanAgent: boolean;
  requiresAttention: boolean;
  suggestedAgentName: string | null;
  assignedToMemberId: string | null;
  assignedToMember: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface ConversationDetail {
  id: string;
  visitorId: string;
  domain: string;
  mode: 'AI_ACTIVE' | 'HUMAN_TAKEOVER' | 'AI_PAUSED';
  unreadCount: number;
  assignedToMemberId: string | null;
  assignedToMember: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  senderType: 'visitor' | 'bot' | 'agent';
  senderName: string | null;
  content: string;
  createdAt: string;
  agentMemberId: string | null;
  // Attachment fields for media messages
  attachmentType: string | null;
  attachmentUrl: string | null;
  attachmentMimeType: string | null;
  attachmentSize: number | null;
  transcription: string | null;
}

class ChatService {
  /**
   * Get all conversations (matches web admin)
   */
  async getConversations(status: 'OPEN' | 'CLOSED' | 'ARCHIVED' = 'OPEN'): Promise<ConversationPreview[]> {
    console.log('🔄 chatService.getConversations() - status:', status);
    const response = await apiClient.get(`/v1/admin/chats?status=${status}`);
    console.log('✅ chatService.getConversations() - Count:', response.data.conversations?.length || 0);
    return response.data.conversations || [];
  }

  /**
   * Get conversation detail with all messages
   */
  async getConversationById(chatId: string): Promise<ConversationDetail> {
    console.log('🔄 chatService.getConversationById() - chatId:', chatId);
    const response = await apiClient.get(`/v1/admin/chats/${chatId}`);
    console.log('✅ chatService.getConversationById() - Messages:', response.data.conversation?.messages?.length || 0);
    return response.data.conversation;
  }

  /**
   * Send a reply (matches web admin)
   */
  async sendReply(chatId: string, content: string, agentId: string): Promise<ChatMessage> {
    console.log('📤 chatService.sendReply() - chatId:', chatId, 'agentId:', agentId);
    const response = await apiClient.post(`/v1/admin/chats/${chatId}/reply`, {
      content,
      agentId,
    });
    console.log('✅ chatService.sendReply() - Success');
    return response.data.message;
  }

  /**
   * Update conversation mode (AI_ACTIVE, HUMAN_TAKEOVER, AI_PAUSED)
   */
  async updateMode(chatId: string, mode: 'AI_ACTIVE' | 'HUMAN_TAKEOVER' | 'AI_PAUSED'): Promise<void> {
    console.log('🔄 chatService.updateMode() - chatId:', chatId, 'mode:', mode);
    await apiClient.patch(`/v1/admin/chats/${chatId}/mode`, { mode });
    console.log('✅ chatService.updateMode() - Success');
  }

  /**
   * Claim conversation (assign to current agent)
   */
  async claimConversation(conversationId: string): Promise<void> {
    console.log('🔄 chatService.claimConversation() - conversationId:', conversationId);
    await apiClient.post('/v1/agent/conversations/claim', { conversationId });
    console.log('✅ chatService.claimConversation() - Success');
  }

  /**
   * Release conversation (unassign from current agent)
   */
  async releaseConversation(conversationId: string): Promise<void> {
    console.log('🔄 chatService.releaseConversation() - conversationId:', conversationId);
    await apiClient.post('/v1/agent/conversations/release', { conversationId });
    console.log('✅ chatService.releaseConversation() - Success');
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'AWAY'): Promise<void> {
    console.log('🔄 chatService.updateAgentStatus() - status:', status);
    await apiClient.put('/v1/agent/status', { status });
    console.log('✅ chatService.updateAgentStatus() - Success');
  }

  /**
   * Get all agents with status
   */
  async getAgentsWithStatus(): Promise<{ agents: any[]; currentStatus: string }> {
    console.log('🔄 chatService.getAgentsWithStatus()');
    const response = await apiClient.get('/v1/agent/all');
    console.log('✅ chatService.getAgentsWithStatus() - Count:', response.data.agents?.length || 0);
    return response.data;
  }

  /**
   * Close conversation (requires chats:close permission)
   */
  async closeConversation(conversationId: string): Promise<void> {
    console.log('🔄 chatService.closeConversation() - conversationId:', conversationId);
    await apiClient.post(`/v1/admin/chats/${conversationId}/close`);
    console.log('✅ chatService.closeConversation() - Success');
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<{
    openChats: number;
    claimedChats: number;
    requiresAttention: number;
    currentStatus: string;
  }> {
    console.log('🔄 chatService.getDashboardStats()');
    const response = await apiClient.get('/v1/agent/dashboard-stats');
    console.log('✅ chatService.getDashboardStats() - Success');
    return response.data;
  }
}

export const chatService = new ChatService();
export default chatService;
