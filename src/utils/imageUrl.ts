/**
 * Resolve a stored image URL to a mobile-accessible URL.
 *
 * The backend stores absolute URLs using its own API_BASE_URL (e.g. http://localhost:4010).
 * From a mobile device/emulator, "localhost" points to the device itself, not the host Mac.
 * This utility rewrites the host to the correct API base URL from the mobile config.
 */

import { env } from '../config/env';

export const resolveImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;

    try {
        const parsed = new URL(url);
        const apiBase = new URL(env.API_BASE_URL);

        // Replace the origin (protocol + host + port) with the mobile-accessible origin
        // This handles: localhost → 192.168.x.x, ngrok URLs, production URLs, etc.
        return `${apiBase.origin}${parsed.pathname}${parsed.search}`;
    } catch {
        // If URL parsing fails (e.g. relative URLs), return as-is
        return url;
    }
};
