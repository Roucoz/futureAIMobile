/**
 * Contact Service
 * API calls for customer contacts across all channels
 */

import apiClient from './client';

export interface Contact {
  id: string;
  phoneNumber: string;
  name: string | null;
  email: string | null;
  customerType: 'NEW' | 'RETURNING' | 'VIP' | 'ARCHIVED';
  isVip: boolean;
  isBlocked: boolean;
  phoneVerified: boolean;
  preferredLanguage: string | null;
  detectedLanguages: string[];
  timezone: string | null;
  channels: ('WHATSAPP' | 'WIDGET' | 'SMS')[];
  tags: string[];
  notes: string | null;
  customFields: Record<string, any>;
  aiSummary: string | null;
  totalConversations: number;
  totalOrders: number;
  totalSpent: number | null;
  averageRating: number | null;
  firstContactedAt: string;
  lastContactedAt: string;
  lastOrderAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactDetail extends Contact {
  conversationCount: number;
}

export interface ContactsResponse {
  contacts: Contact[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GetContactsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  customerType?: 'NEW' | 'RETURNING' | 'VIP' | 'ARCHIVED';
  isVip?: boolean;
  sortBy?: 'lastContactedAt' | 'totalConversations' | 'name';
  sortOrder?: 'asc' | 'desc';
}

class ContactService {
  /**
   * Get paginated contacts with filtering and sorting
   */
  async getContacts(params: GetContactsParams = {}): Promise<ContactsResponse> {
    const {
      page = 1,
      pageSize = 20,
      search,
      customerType,
      isVip,
      sortBy = 'lastContactedAt',
      sortOrder = 'desc',
    } = params;

    console.log('🔄 contactService.getContacts() - params:', params);

    const queryParams = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...(search && { search }),
      ...(customerType && { customerType }),
      ...(isVip !== undefined && { isVip: isVip.toString() }),
    });

    const response = await apiClient.get(`/v1/admin/contacts?${queryParams}`);
    console.log('✅ contactService.getContacts() - Count:', response.data.contacts?.length || 0);

    // Sort on client side if needed (backend may not support all sort options yet)
    let contacts = response.data.contacts || [];
    if (sortBy) {
      contacts = contacts.sort((a: Contact, b: Contact) => {
        let compareValue = 0;
        if (sortBy === 'name') {
          const nameA = (a.name || a.phoneNumber).toLowerCase();
          const nameB = (b.name || b.phoneNumber).toLowerCase();
          compareValue = nameA.localeCompare(nameB);
        } else if (sortBy === 'lastContactedAt') {
          compareValue = new Date(a.lastContactedAt).getTime() - new Date(b.lastContactedAt).getTime();
        } else if (sortBy === 'totalConversations') {
          compareValue = a.totalConversations - b.totalConversations;
        }
        return sortOrder === 'asc' ? compareValue : -compareValue;
      });
    }

    return {
      contacts,
      total: response.data.total,
      page: response.data.page,
      pageSize: response.data.pageSize,
      totalPages: response.data.totalPages,
    };
  }

  /**
   * Get single contact by ID
   */
  async getContactById(contactId: string): Promise<ContactDetail> {
    console.log('🔄 contactService.getContactById() - contactId:', contactId);
    const response = await apiClient.get(`/v1/admin/contacts/${contactId}`);
    console.log('✅ contactService.getContactById() - Contact:', response.data.name);
    return response.data;
  }

  /**
   * Update contact information
   */
  async updateContact(contactId: string, data: Partial<Contact>): Promise<Contact> {
    console.log('🔄 contactService.updateContact() - contactId:', contactId);
    const response = await apiClient.patch(`/v1/admin/contacts/${contactId}`, data);
    console.log('✅ contactService.updateContact() - Updated');
    return response.data.contact;
  }

  /**
   * Get conversations for a specific contact
   */
  async getContactConversations(contactId: string, phoneNumber: string): Promise<any[]> {
    console.log('🔄 contactService.getContactConversations() - phoneNumber:', phoneNumber);
    // Use the chats endpoint with visitorId filter
    const response = await apiClient.get(`/v1/admin/chats?visitorId=${encodeURIComponent(phoneNumber)}`);
    console.log('✅ contactService.getContactConversations() - Count:', response.data.conversations?.length || 0);
    return response.data.conversations || [];
  }

  /**
   * Get tickets for a specific contact
   */
  async getContactTickets(contactId: string): Promise<any[]> {
    console.log('🔄 contactService.getContactTickets() - contactId:', contactId);
    try {
      const response = await apiClient.get(`/v1/admin/tickets?contactId=${contactId}`);
      console.log('✅ contactService.getContactTickets() - Count:', response.data.tickets?.length || 0);
      return response.data.tickets || [];
    } catch (error: any) {
      // Return empty array if tickets module is not enabled or endpoint doesn't exist
      if (error.response?.status === 404 || error.response?.status === 403) {
        console.log('⚠️ Tickets not available for this contact');
        return [];
      }
      throw error;
    }
  }

  /**
   * Initiate a new conversation with a contact
   */
  async startConversation(phoneNumber: string, channel: 'WHATSAPP' | 'WIDGET' = 'WIDGET'): Promise<{ conversationId: string }> {
    console.log('🔄 contactService.startConversation() - phoneNumber:', phoneNumber);
    const response = await apiClient.post('/v1/admin/conversations/initiate', {
      visitorId: phoneNumber,
      channel,
    });
    console.log('✅ contactService.startConversation() - conversationId:', response.data.conversationId);
    return response.data;
  }
}

export default new ContactService();
