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
  customerType: 'NEW' | 'REGULAR' | 'VIP' | 'BLOCKED' | 'INACTIVE';
  isVip: boolean;
  isBlocked: boolean;
  phoneVerified: boolean;
  preferredLanguage: string | null;
  detectedLanguages: string[];
  timezone: string | null;
  channels: (
    | 'WHATSAPP'
    | 'WIDGET'
    | 'SMS'
    | 'TELEGRAM'
    | 'FACEBOOK_MESSENGER'
    | 'INSTAGRAM'
  )[];
  aliases?: string[]; // Native channel ids (IG id, Telegram id, PSID, widget visitorId)
  tags: string[];
  notes: string | null;
  customFields: Record<string, any>;
  aiSummary: string | null;
  totalConversations: number;
  totalOrders: number;
  totalAppointments: number;
  totalTickets: number;
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
  customerType?: 'NEW' | 'REGULAR' | 'VIP' | 'BLOCKED' | 'INACTIVE';
  isVip?: boolean;
  sortBy?: 'lastContactedAt' | 'totalConversations' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  bodyText: string;
  headerType?: string | null;
  headerText?: string | null;
  footerText?: string | null;
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
    console.log(
      '✅ contactService.getContacts() - Count:',
      response.data.contacts?.length || 0,
    );

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
          compareValue =
            new Date(a.lastContactedAt).getTime() -
            new Date(b.lastContactedAt).getTime();
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
    console.log(
      '✅ contactService.getContactById() - Contact:',
      response.data.name,
    );
    return response.data;
  }

  /**
   * Update contact information
   */
  async updateContact(
    contactId: string,
    data: Partial<Contact>,
  ): Promise<Contact> {
    console.log('🔄 contactService.updateContact() - contactId:', contactId);
    const response = await apiClient.patch(
      `/v1/admin/contacts/${contactId}`,
      data,
    );
    console.log('✅ contactService.updateContact() - Updated');
    return response.data.contact;
  }

  /**
   * Get conversations for a specific contact
   */
  async getContactConversations(
    contactId: string,
    phoneNumber: string,
  ): Promise<any[]> {
    console.log(
      '🔄 contactService.getContactConversations() - phoneNumber:',
      phoneNumber,
    );
    // Use the chats endpoint with the `search` filter (the backend's listChats
    // reads `search`, not `visitorId`) to find this contact's conversations.
    // status=ALL so we return the full history (open + closed), not just OPEN.
    // contactId makes the backend also include conversations linked via the
    // contact's orders/tickets (even when visitorId no longer matches).
    const params = new URLSearchParams({ status: 'ALL', limit: '50' });
    if (phoneNumber) params.set('search', phoneNumber);
    if (contactId) params.set('contactId', contactId);
    const response = await apiClient.get(`/v1/admin/chats?${params.toString()}`);
    console.log(
      '✅ contactService.getContactConversations() - Count:',
      response.data.conversations?.length || 0,
    );
    // Normalize the backend shape (last message lives in `messages[0]`) into the
    // shape the ContactConversationsScreen renders. The chat summary is shown
    // as the item text; summary may be a plain string or a JSON object.
    return (response.data.conversations || []).map((c: any) => {
      const rawSummary: unknown = c.summary;
      let summary = '';
      if (typeof rawSummary === 'string') {
        summary = rawSummary;
      } else if (rawSummary && typeof rawSummary === 'object') {
        const s = (rawSummary as Record<string, unknown>).summary;
        summary = typeof s === 'string' ? s : JSON.stringify(rawSummary);
      }
      return {
        id: c.id,
        status: c.status,
        channel: c.channel,
        summary,
        lastMessagePreview: c.messages?.[0]?.content || '',
        updatedAt: c.updatedAt,
      };
    });
  }

  /**
   * Get tickets for a specific contact
   */
  async getContactTickets(contactId: string): Promise<any[]> {
    console.log(
      '🔄 contactService.getContactTickets() - contactId:',
      contactId,
    );
    try {
      const response = await apiClient.get(
        `/v1/admin/tickets?customerId=${contactId}`,
      );
      console.log(
        '✅ contactService.getContactTickets() - Count:',
        response.data.data?.length || 0,
      );
      return response.data.data || [];
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
   * Find an existing OPEN conversation for a contact (by phone number).
   * Returns `null` when there is nothing to open yet — in that case the UI
   * should let the agent start a new chat (see initiateConversation).
   */
  async startConversation(
    phoneNumber: string,
  ): Promise<{ conversationId: string | null }> {
    console.log(
      '🔄 contactService.startConversation() - phoneNumber:',
      phoneNumber,
    );
    const response = await apiClient.get(
      `/v1/admin/chats?search=${encodeURIComponent(phoneNumber)}`,
    );
    const conversations = response.data.conversations || [];
    const openConversation = conversations.find(
      (c: any) => c.status === 'OPEN',
    );
    if (openConversation) {
      console.log(
        '✅ contactService.startConversation() - conversationId:',
        openConversation.id,
      );
      return { conversationId: openConversation.id };
    }
    return { conversationId: null };
  }

  /**
   * Check WhatsApp 24-hour eligibility for a phone number.
   * Mirrors the web admin: GET /v1/admin/chats/check-eligibility/:phoneNumber
   */
  async checkEligibility(
    phoneNumber: string,
  ): Promise<{
    hasActiveConversation: boolean;
    conversationId: string | null;
    canInitiate: boolean;
    within24Hours: boolean;
    requiresTemplate: boolean;
    lastCustomerMessageAt: string | null;
  }> {
    const response = await apiClient.get(
      `/v1/admin/chats/check-eligibility/${encodeURIComponent(phoneNumber)}`,
    );
    return response.data;
  }

  /**
   * Fetch approved WhatsApp templates, used to start a conversation when the
   * customer is outside the 24-hour free-form window.
   */
  async getApprovedWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
    const response = await apiClient.get(
      '/v1/admin/whatsapp-templates?status=APPROVED',
    );
    return response.data.templates || [];
  }

  /**
   * Initiate a new WhatsApp conversation by sending an initial message or an
   * approved template. Mirrors the web admin: POST /v1/admin/chats/initiate
   */
  async initiateConversation(payload: {
    phoneNumber: string;
    agentId: string;
    message?: string;
    templateId?: string;
    templateParams?: string[];
  }): Promise<{ conversationId: string }> {
    console.log(
      '🔄 contactService.initiateConversation() - phoneNumber:',
      payload.phoneNumber,
    );
    const response = await apiClient.post('/v1/admin/chats/initiate', payload);
    console.log(
      '✅ contactService.initiateConversation() - conversationId:',
      response.data.conversation?.id,
    );
    return { conversationId: response.data.conversation.id };
  }

  /**
   * Send an SMS directly to a contact.
   * Mirrors the web admin: POST /v1/admin/sms/send-to-contact
   */
  async sendSmsToContact(
    contactId: string,
    message: string,
  ): Promise<{ messageId: string; segmentCount: number; cost: number }> {
    console.log(
      '🔄 contactService.sendSmsToContact() - contactId:',
      contactId,
    );
    const response = await apiClient.post('/v1/admin/sms/send-to-contact', {
      contactId,
      message,
    });
    return response.data.data;
  }

  /**
   * Find an existing OPEN Instagram conversation for a customer (by IG user id).
   * Returns `null` when there is nothing to open yet — in that case the UI
   * should let the agent start a new one (see initiateInstagramConversation).
   */
  async startInstagramConversation(
    igUserId: string,
  ): Promise<{ conversationId: string | null }> {
    console.log(
      '🔄 contactService.startInstagramConversation() - igUserId:',
      igUserId,
    );
    const response = await apiClient.get(
      `/v1/admin/chats?search=${encodeURIComponent(igUserId)}`,
    );
    const conversations = response.data.conversations || [];
    const openInstagram = conversations.find(
      (c: any) => c.status === 'OPEN' && c.channel === 'INSTAGRAM',
    );
    if (openInstagram) {
      console.log(
        '✅ contactService.startInstagramConversation() - conversationId:',
        openInstagram.id,
      );
      return { conversationId: openInstagram.id };
    }
    return { conversationId: null };
  }

  /**
   * Initiate a new Instagram conversation by sending an initial Direct message.
   * Instagram has no approved-template requirement (unlike WhatsApp), so the
   * agent always sends a free-form message.
   * POST /v1/admin/chats/initiate with channel=INSTAGRAM
   */
  async initiateInstagramConversation(payload: {
    phoneNumber: string; // Instagram user id (native id stored on the contact)
    agentId: string;
    message: string;
  }): Promise<{ conversationId: string }> {
    console.log(
      '🔄 contactService.initiateInstagramConversation() - igUserId:',
      payload.phoneNumber,
    );
    const response = await apiClient.post('/v1/admin/chats/initiate', {
      ...payload,
      channel: 'INSTAGRAM',
    });
    console.log(
      '✅ contactService.initiateInstagramConversation() - conversationId:',
      response.data.conversation?.id,
    );
    return { conversationId: response.data.conversation.id };
  }

  /**
   * Find an existing OPEN Telegram conversation for a customer (by chat id).
   * Returns `null` when there is nothing to open yet — in that case the UI
   * should let the agent start a new one (see initiateTelegramConversation).
   */
  async startTelegramConversation(
    chatId: string,
  ): Promise<{ conversationId: string | null }> {
    console.log(
      '🔄 contactService.startTelegramConversation() - chatId:',
      chatId,
    );
    const response = await apiClient.get(
      `/v1/admin/chats?search=${encodeURIComponent(chatId)}`,
    );
    const conversations = response.data.conversations || [];
    const openTelegram = conversations.find(
      (c: any) => c.status === 'OPEN' && c.channel === 'TELEGRAM',
    );
    if (openTelegram) {
      console.log(
        '✅ contactService.startTelegramConversation() - conversationId:',
        openTelegram.id,
      );
      return { conversationId: openTelegram.id };
    }
    return { conversationId: null };
  }

  /**
   * Initiate a new Telegram conversation by sending an initial message.
   * Telegram has no approved-template requirement (unlike WhatsApp), so the
   * agent always sends a free-form message.
   * POST /v1/admin/chats/initiate with channel=TELEGRAM
   */
  async initiateTelegramConversation(payload: {
    phoneNumber: string; // Telegram chat id (native id stored on the contact)
    agentId: string;
    message: string;
  }): Promise<{ conversationId: string }> {
    console.log(
      '🔄 contactService.initiateTelegramConversation() - chatId:',
      payload.phoneNumber,
    );
    const response = await apiClient.post('/v1/admin/chats/initiate', {
      ...payload,
      channel: 'TELEGRAM',
    });
    console.log(
      '✅ contactService.initiateTelegramConversation() - conversationId:',
      response.data.conversation?.id,
    );
    return { conversationId: response.data.conversation.id };
  }
}

/**
 * Resolve the native id (Telegram chat id / Instagram user id) for a contact
 * that has the given channel.
 * For phone-less contacts, `phoneNumber` stores the native id. When the
 * contact also has a real phone (primary identifier), the native id lives in
 * `aliases`. Returns null when the contact isn't reachable on that channel.
 */
const getNativeChannelUserId = (
  contact: Contact,
  channel: 'TELEGRAM' | 'INSTAGRAM',
): string | null => {
  if (!contact.channels?.includes(channel)) return null;

  // Native ids are numeric (Telegram chat ids may be negative) — prefer a
  // matching alias entry, then fall back to phoneNumber.
  const aliases = Array.isArray(contact.aliases) ? contact.aliases : [];
  const nativeAlias = aliases.find(a => /^-?\d{6,}$/.test(a));
  if (nativeAlias) return nativeAlias;

  if (/^-?\d{6,}$/.test(contact.phoneNumber)) return contact.phoneNumber;

  return null;
};

/**
 * Resolve the Instagram user id for a contact that has an INSTAGRAM channel.
 */
export const getInstagramUserId = (contact: Contact): string | null =>
  getNativeChannelUserId(contact, 'INSTAGRAM');

/**
 * Resolve the Telegram chat id for a contact that has a TELEGRAM channel.
 */
export const getTelegramChatId = (contact: Contact): string | null =>
  getNativeChannelUserId(contact, 'TELEGRAM');

export default new ContactService();
