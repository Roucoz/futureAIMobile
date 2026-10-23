/**
 * Sales leads API (mobile).
 *
 * Only the one call the app needs today: turning the conversation an agent is
 * looking at into a lead. The web backoffice owns the full pipeline UI.
 */

import apiClient from './client';

export interface CreateLeadPayload {
    contactId?: string | null;
    conversationId?: string | null;
    summary?: string | null;
    tags?: string[];
}

class LeadService {
    /** Creates a lead from a customer or a conversation (one of them is required). */
    async createLead(payload: CreateLeadPayload): Promise<{ id: string } | null> {
        const response = await apiClient.post<{ lead?: { id: string } }>(
            '/v1/admin/leads',
            payload,
        );
        return response.data?.lead ?? null;
    }
}

export const leadService = new LeadService();
export default leadService;
