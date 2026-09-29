/**
 * Blocked-account copy for the mobile app.
 *
 * Kept in one place so the modal (loud, once) and the banner (persistent
 * reminder) can never drift apart, and so the wording stays aligned with the web
 * panel's AccountBlockedModal: a trial that ended, a renewal that could not be
 * charged, and a suspension are three different problems, and telling a paying
 * customer their "trial expired" is exactly the bug we fixed there.
 *
 * The reason strings come from the API's shared account gate
 * (apps/api/src/utils/account-gate.ts).
 */

import { Alert, Linking } from 'react-native';
import { env } from '../config/env';
import type { AccountStatus } from '../services/api/auth.service';

/**
 * Web twin of the API host: api.tuxon.ai → app.tuxon.ai, dev-api → dev-app.
 * Null when the API is a local/dev-machine address with no web counterpart.
 */
const BILLING_WEB_URL = (() => {
    const base = env.API_BASE_URL.replace(/\/+$/, '');
    if (base.startsWith('https://dev-api.')) {
        return `${base.replace('dev-api.', 'dev-app.')}/admin/billing/add-payment`;
    }
    if (base.startsWith('https://api.')) {
        return `${base.replace('api.', 'app.')}/admin/billing/add-payment`;
    }
    return null;
})();

/**
 * Billing is web-only, so every blocked-account action sends the user to the
 * dashboard; without a known web host we explain what to do instead of opening
 * a dead link.
 */
export function openBillingOnWeb(cta: string): void {
    if (BILLING_WEB_URL) {
        Linking.openURL(BILLING_WEB_URL).catch(() => showWebInstructions(cta));
        return;
    }
    showWebInstructions(cta);
}

function showWebInstructions(cta: string): void {
    Alert.alert(
        cta,
        `Billing is managed from the web panel.\n\nOpen your browser, sign in to the Tuxon dashboard and go to Billing → ${cta} to restore full access.`,
        [{ text: 'Got It' }],
    );
}

export interface BlockedCopy {
    icon: string;
    title: string;
    /** One line describing what happened. */
    firstLine: string;
    /** One line describing how to fix it. */
    actionLine: string;
    /** Primary button label. */
    cta: string;
}

export function getBlockedCopy(accountStatus: AccountStatus): BlockedCopy {
    switch (accountStatus.reason) {
        case 'TRIAL_EXPIRED':
            return {
                icon: '⏳',
                title: 'Your free trial has ended',
                firstLine: 'Your free trial has expired.',
                actionLine:
                    'Add a payment method to activate your subscription and continue using the platform.',
                cta: 'Add payment method',
            };
        case 'RENEWAL_OVERDUE':
            return {
                icon: '💳',
                title: "Your monthly renewal couldn't be charged",
                firstLine: 'Your monthly subscription renewal is past due.',
                actionLine:
                    'Add funds to your wallet to restore full access — everything resumes automatically.',
                cta: 'Add funds',
            };
        case 'SUSPENDED':
            return {
                icon: '🔒',
                title: 'Your account is suspended',
                firstLine: 'Your account has been suspended due to insufficient balance.',
                actionLine: 'Add credits to restore full access.',
                cta: 'Add credits',
            };
        default:
            return {
                icon: '🔒',
                title: 'Your account is restricted',
                firstLine: 'Your account is currently in read-only mode.',
                actionLine: 'Check your billing details to restore full access.',
                cta: 'Open billing',
            };
    }
}
