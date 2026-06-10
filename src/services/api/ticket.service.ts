/**
 * Ticket Service
 * API calls for ticket management
 */

import apiClient from './client';

export interface Ticket {
  id: string;
  summary: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  assignedToMember: {
    id: string;
    displayName: string | null;
  } | null;
  createdByMember: {
    id: string;
    displayName: string | null;
  };
  customer: {
    id: string;
    name: string | null;
    phoneNumber: string;
    email: string | null;
  } | null;
  conversationId: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface TicketPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetTicketsResult {
  tickets: Ticket[];
  pagination: TicketPagination;
}

export interface TicketStatus {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  order: number;
}

export interface TicketStatus {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface UpdateTicketData {
  summary?: string;
  description?: string;
  status?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category?: string;
  assignedToMemberId?: string;
}

export interface TicketDetail extends Ticket {
  notes: TicketNote[];
  statusHistory: TicketStatusHistory[];
  _count: { notes: number };
}

export interface TicketNote {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  author: {
    id: string;
    displayName: string | null;
    user: { email: string; firstName: string | null; lastName: string | null };
  };
}

export interface TicketStatusHistory {
  id: string;
  fromStatus: string;
  toStatus: string;
  createdAt: string;
  changedByMember: {
    id: string;
    displayName: string | null;
  } | null;
}

export interface CreateTicketData {
  summary: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status?: string;
  assignedToMemberId?: string;
  conversationId?: string;
}

class TicketService {
  /**
   * Get tickets with pagination and filters
   */
  async getTickets(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<GetTicketsResult> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit));

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await apiClient.get(`/v1/admin/tickets${query}`);
    return {
      tickets: response.data.data || [],
      pagination: response.data.pagination || {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      },
    };
  }

  /**
   * Get ticket by ID (full detail)
   */
  async getTicketById(ticketId: string): Promise<TicketDetail> {
    const response = await apiClient.get(`/v1/admin/tickets/${ticketId}`);
    return response.data.data;
  }

  /**
   * Create a new ticket
   */
  async createTicket(data: CreateTicketData): Promise<Ticket> {
    const response = await apiClient.post('/v1/admin/tickets', data);
    return response.data.data;
  }

  /**
   * Create ticket from conversation
   */
  async createTicketFromConversation(
    conversationId: string,
    summary: string,
    description: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
  ): Promise<Ticket> {
    const response = await apiClient.post(
      '/v1/admin/tickets/from-conversation',
      { conversationId, summary, description, priority },
    );
    return response.data.data;
  }

  /**
   * Update ticket
   */
  async updateTicket(
    ticketId: string,
    data: UpdateTicketData,
  ): Promise<Ticket> {
    const response = await apiClient.patch(
      `/v1/admin/tickets/${ticketId}`,
      data,
    );
    return response.data.data;
  }

  /**
   * Close ticket
   */
  async closeTicket(ticketId: string, note?: string): Promise<void> {
    await apiClient.post(`/v1/admin/tickets/${ticketId}/close`, { note });
  }

  /**
   * Get custom statuses for project
   */
  async getCustomStatuses(): Promise<TicketStatus[]> {
    const response = await apiClient.get('/v1/admin/tickets/statuses/custom');
    return response.data.data || [];
  }
}

export const ticketService = new TicketService();
export default ticketService;
