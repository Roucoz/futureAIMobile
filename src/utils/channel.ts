/**
 * Channel detection helper
 *
 * Determines a conversation's channel from the API `channel` field when
 * available, falling back to parsing the `domain` field (used by the list
 * endpoint and older payloads that do not include `channel`).
 *
 * Backend domain values:
 * - WhatsApp:  "whatsapp" (admin initiate) / "WhatsApp" (inbound webhook)
 * - Telegram:  "Telegram"
 * - Instagram: "Instagram"
 * - Facebook:  "Facebook Messenger"
 * - Widget:    the website domain (e.g. "example.com")
 */

export type ConversationChannelType =
    | 'WIDGET'
    | 'WHATSAPP'
    | 'TELEGRAM'
    | 'INSTAGRAM'
    | 'FACEBOOK_MESSENGER'
    | 'SMS'
    | 'OTHER';

const KNOWN_CHANNELS: ConversationChannelType[] = [
    'WIDGET',
    'WHATSAPP',
    'TELEGRAM',
    'INSTAGRAM',
    'FACEBOOK_MESSENGER',
    'SMS',
];

export function getConversationChannel(
    channel?: string | null,
    domain?: string | null,
): ConversationChannelType {
    const ch = (channel || '').toUpperCase();
    if (KNOWN_CHANNELS.includes(ch as ConversationChannelType)) {
        return ch as ConversationChannelType;
    }

    const d = (domain || '').toLowerCase();
    if (d === 'whatsapp') return 'WHATSAPP';
    if (d === 'telegram') return 'TELEGRAM';
    if (d === 'instagram') return 'INSTAGRAM';
    if (d === 'facebook messenger' || d === 'facebook' || d === 'messenger') {
        return 'FACEBOOK_MESSENGER';
    }

    // Anything else (real website domains, unknown) is treated as a widget chat
    return 'WIDGET';
}
