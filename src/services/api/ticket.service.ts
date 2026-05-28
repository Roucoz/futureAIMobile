/**
 * Ticket Service
 * API calls for ticket management
 */

import apiClient from './client';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedToId: string | null;
  assignedTo: { id: string; name: string } | null;
  conversationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketStatus {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  order: number;
}

export interface CreateTicketData {
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  statusId?: string;
  assignedToId?: string;
  conversationId?: string;
}

class TicketService {
  /**
   * Get all tickets
   */
  async getTickets(status?: string): Promise<Ticket[]> {
    console.log('🔄 ticketService.getTickets() - status:', status);
    const params = status ? `?status=${status}` : '';
    const response = await apiClient.get(`/v1/admin/tickets${params}`);
    console.log('✅ ticketService.getTickets() - Count:', response.data.tickets?.length || 0);
    return response.data.tickets || [];
  }

  /**
   * Get ticket by ID
   */
  async getTicketById(ticketId: string): Promise<Ticket> {
    console.log('🔄 ticketService.getTicketById() - ticketId:', ticketId);
    const response = await apiClient.get(`/v1/admin/tickets/${ticketId}`);
    console.log('✅ ticketService.getTicketById() - Success');
    return response.data.ticket;
  }

  /**
   * Create a new ticket
   */
  async createTicket(data: CreateTicketData): Promise<Ticket> {
    console.log('📤 ticketService.createTicket() - data:', data);
    const response = await apiClient.post('/v1/admin/tickets', data);
    console.log('✅ ticketService.createTicket() - Success');
    return response.data.ticket;
  }

  /**
   * Create ticket from conversation
   */
  async createTicketFromConversation(
    conversationId: string,
    title: string,
    description: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
  ): Promise<Ticket> {
    console.log('📤 ticketService.createTicketFromConversation() - conversationId:', conversationId);
    const response = await apiClient.post('/v1/admin/tickets/from-conversation', {
      conversationId,
      title,
      description,
      priority,
    });
    console.log('✅ ticketService.createTicketFromConversation() - Success');
    return response.data.ticket;
  }

  /**
   * Get ticket statuses
   */
  async getTicketStatuses(): Promise<TicketStatus[]> {
    console.log('🔄 ticketService.getTicketStatuses()');
    const response = await apiClient.get('/v1/admin/tickets/statuses');
    console.log('✅ ticketService.getTicketStatuses() - Count:', response.data.statuses?.length || 0);
    return response.data.statuses || [];
  }

  /**
   * Update ticket
   */
  async updateTicket(ticketId: string, data: Partial<CreateTicketData>): Promise<Ticket> {
    console.log('📤 ticketService.updateTicket() - ticketId:', ticketId);
    const response = await apiClient.patch(`/v1/admin/tickets/${ticketId}`, data);
    console.log('✅ ticketService.updateTicket() - Success');
    return response.data.ticket;
  }

  /**
   * Close ticket
   */
  async closeTicket(ticketId: string): Promise<void> {
    console.log('📤 ticketService.closeTicket() - ticketId:', ticketId);
    await apiClient.post(`/v1/admin/tickets/${ticketId}/close`);
    console.log('✅ ticketService.closeTicket() - Success');
  }
}

export const ticketService = new TicketService();
export default ticketService;
