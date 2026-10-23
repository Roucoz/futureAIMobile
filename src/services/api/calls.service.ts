/**
 * WhatsApp calling API (mobile)
 *
 * Mirrors the endpoints the web dashboard uses. Audio never passes through the
 * backend: the phone builds the WebRTC answer locally and posts it here, and the
 * audio flows straight to Meta.
 */

import apiClient from './client';

export interface WhatsAppCallRow {
    id: string;
    callId: string;
    direction?: string;
    status: string;
    fromNumber: string | null;
    toNumber: string | null;
    customerName: string | null;
    offeredMemberId?: string | null;
    durationSeconds: number | null;
    createdAt: string;
    /** SDP offer, present only on the pending endpoint. */
    sdpOffer?: string | null;
}

export interface CallSettings {
    isEnabled: boolean;
    ringTimeoutSeconds: number;
}

export interface CallStats {
    active: number;
    today: number;
    missedToday: number;
    total: number;
}

class CallsService {
    /** Calls still ringing or offered to this agent (survives a reload). */
    async getPending(): Promise<WhatsAppCallRow[]> {
        const response = await apiClient.get<{
            calls: WhatsAppCallRow[];
        }>('/v1/channels/whatsapp/calling/calls/pending');
        return response.data?.calls ?? [];
    }

    /** Ring duration and whether calling is enabled for this workspace. */
    async getSettings(): Promise<CallSettings | null> {
        try {
            const response = await apiClient.get<{
                settings: CallSettings;
            }>('/v1/channels/whatsapp/calling/settings');
            return response.data?.settings ?? null;
        } catch {
            return null;
        }
    }

    /**
     * Place an outbound (business-initiated) call.
     *
     * The phone supplies the SDP offer; Meta's answer does NOT come back here —
     * it arrives on the dashboard socket (`whatsapp_call_connected`) and is what
     * completes the peer connection.
     */
    async initiate(request: {
        to: string;
        sdp: string;
        conversationId?: string | null;
    }): Promise<WhatsAppCallRow | null> {
        const response = await apiClient.post<{ call: WhatsAppCallRow }>(
            '/v1/channels/whatsapp/calling/calls',
            request,
        );
        return response.data?.call ?? null;
    }

    /** First agent to claim wins; the others are told it is taken. */
    async claim(callId: string): Promise<WhatsAppCallRow | null> {
        const response = await apiClient.post<{ call: WhatsAppCallRow }>(
            `/v1/channels/whatsapp/calling/calls/${callId}/claim`,
            {},
        );
        return response.data?.call ?? null;
    }

    /** Send the SDP answer produced by react-native-webrtc. */
    async answer(callId: string, sdp: string): Promise<WhatsAppCallRow | null> {
        const response = await apiClient.post<{ call: WhatsAppCallRow }>(
            `/v1/channels/whatsapp/calling/calls/${callId}/answer`,
            { sdp },
        );
        return response.data?.call ?? null;
    }

    async reject(callId: string, reason?: string): Promise<void> {
        await apiClient.post(
            `/v1/channels/whatsapp/calling/calls/${callId}/reject`,
            { reason: reason ?? 'Declined from the mobile app' },
        );
    }

    async terminate(callId: string): Promise<void> {
        await apiClient.post(
            `/v1/channels/whatsapp/calling/calls/${callId}/terminate`,
            {},
        );
    }

    /** Counters for the dashboard card (total / live / today / missed today). */
    async getStats(): Promise<{ counts: CallStats; enabled: boolean } | null> {
        try {
            const response = await apiClient.get<{
                counts: CallStats;
                enabled?: boolean;
            }>('/v1/channels/whatsapp/calling/stats');
            const counts = response.data?.counts;
            if (!counts) return null;
            return { counts, enabled: response.data?.enabled === true };
        } catch {
            return null;
        }
    }
}

export const callsService = new CallsService();
export default callsService;
