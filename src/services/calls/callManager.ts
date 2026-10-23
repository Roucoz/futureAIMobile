/**
 * WhatsApp call state for the mobile app.
 *
 * One singleton owns the WebRTC peer connection and the current call state; the
 * overlay screen is a dumb view over it. Signalling goes through the API and the
 * dashboard websocket, audio goes straight to Meta.
 *
 * Scope: FOREGROUND answering only. Ringing while the app is closed needs
 * CallKit / PushKit (iOS) and a foreground service + full-screen intent
 * (Android), which is a separate piece of work.
 */

import callsService, { WhatsAppCallRow } from '../api/calls.service';
import { ringtone } from './ringtone';

/**
 * react-native-webrtc is loaded on demand, not at import time.
 *
 * The module needs a native rebuild (Metro bundle + `pod install`), and nothing
 * else in the app should break while that has not happened yet: simulated calls
 * never touch WebRTC, so the dashboard and the call overlay must still boot.
 */
type IceServer = { urls: string; username?: string; credential?: string };

type WebRtcModule = {
    mediaDevices: {
        getUserMedia: (constraints: { audio: boolean }) => Promise<{
            getTracks: () => { forEach: (fn: (track: unknown) => void) => void };
        }>;
    };
    RTCPeerConnection: new (config: { iceServers: IceServer[] }) => PeerLike;
    RTCSessionDescription: new (init: { type: string; sdp: string }) => unknown;
};

type PeerLike = {
    addTrack: (track: unknown, stream: unknown) => void;
    addEventListener: (event: string, handler: () => void) => void;
    setRemoteDescription: (description: unknown) => Promise<void>;
    createOffer: () => Promise<{ sdp?: string }>;
    createAnswer: () => Promise<{ sdp?: string }>;
    setLocalDescription: (description: unknown) => Promise<void>;
    localDescription?: { sdp?: string } | null;
    iceGatheringState?: string;
    close: () => void;
};

const loadWebRtc = (): WebRtcModule => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-webrtc') as WebRtcModule;
};

/**
 * Wait for ICE candidates to be gathered into `localDescription`.
 *
 * Meta expects a complete SDP in a single POST, so trickling candidates one by
 * one is not an option: gather (with a short cap) and send the whole thing.
 */
const waitForIceGathering = (peer: PeerLike, timeoutMs = 2000): Promise<void> =>
    new Promise((resolve) => {
        if (peer.iceGatheringState === 'complete') {
            resolve();
            return;
        }

        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve();
        };

        peer.addEventListener('icegatheringstatechange', finish);
        const timer = setTimeout(finish, timeoutMs);
    });

export type CallPhase =
    | 'idle'
    | 'ringing'
    | 'calling'
    | 'connecting'
    | 'active'
    | 'ended';

/** What a call button gets back, so the screen can show an alert. */
export type OutboundCallResult =
    | { ok: true }
    | { ok: false; message: string; requiresPermission?: boolean };

export interface CallState {
    phase: CallPhase;
    call: WhatsAppCallRow | null;
    seconds: number;
    muted: boolean;
    error: string | null;
}

type Listener = (state: CallState) => void;

type RealtimeMessage = {
    type?: string;
    call?: WhatsAppCallRow;
    sdpOffer?: string;
    sdpAnswer?: string;
    reason?: string;
};

/**
 * Optional TURN relay. Direct candidates work on most networks; corporate or
 * mobile NAT sometimes needs a relay. Configure via app config, never hard-code
 * credentials in the bundle.
 */
const iceServers: IceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

const ringTimeoutFallbackSeconds = 25;

class CallManager {
    private state: CallState = {
        phase: 'idle',
        call: null,
        seconds: 0,
        muted: false,
        error: null,
    };

    private listeners: Listener[] = [];
    private peer: PeerLike | null = null;
    private localStream: any = null;
    private offerSdp: string | null = null;
    /**
     * Meta can answer an outbound call before POST /calls has returned the row,
     * so an early answer is parked here and applied once the row arrives.
     */
    private pendingAnswer: { callId: string; sdp: string } | null = null;
    private timer: ReturnType<typeof setInterval> | null = null;
    private ringTimer: ReturnType<typeof setTimeout> | null = null;
    private myMemberId: string | null = null;
    private ringTimeoutSeconds = ringTimeoutFallbackSeconds;
    /** Workspace voice-calling switch. Off = the phone never rings. */
    private callsEnabled = true;

    // ---- subscription plumbing -------------------------------------------------

    subscribe(listener: Listener): () => void {
        this.listeners.push(listener);
        listener(this.state);
        return () => {
            this.listeners = this.listeners.filter((item) => item !== listener);
        };
    }

    getState(): CallState {
        return this.state;
    }

    setMember(memberId: string | null) {
        this.myMemberId = memberId;
    }

    /** Workspace switch, cached by `recoverPendingCall` / `startOutbound`. */
    isCallingEnabled(): boolean {
        return this.callsEnabled;
    }

    private set(patch: Partial<CallState>) {
        this.state = { ...this.state, ...patch };
        this.listeners.forEach((listener) => listener(this.state));
    }

    // ---- entry points ----------------------------------------------------------

    /** After login or a websocket reconnect: is a call still waiting for me? */
    async recoverPendingCall() {
        if (this.state.phase !== 'idle') return;
        try {
            const settings = await callsService.getSettings();
            // Voice calling is opt-in: a workspace with it off must never ring.
            this.callsEnabled = settings?.isEnabled !== false;
            if (settings?.ringTimeoutSeconds) {
                this.ringTimeoutSeconds = Math.min(
                    Math.max(settings.ringTimeoutSeconds, 5),
                    60,
                );
            }
            if (!this.callsEnabled) return;

            const pending = await callsService.getPending();
            const mine = pending.find(
                (call) =>
                    call.sdpOffer &&
                    (!call.offeredMemberId || call.offeredMemberId === this.myMemberId),
            );
            if (mine?.sdpOffer) {
                this.showIncoming(mine, mine.sdpOffer);
            }
        } catch {
            // Calling is optional: a disabled module must not surface an error here.
        }
    }

    /** Feed the dashboard websocket events in. */
    handleRealtime(message: RealtimeMessage) {
        if (message.type === 'whatsapp_call_incoming' && message.call) {
            // Calling switched off for this workspace: ignore the ring entirely.
            if (!this.callsEnabled) return;
            // Sequential routing offers one agent at a time.
            if (
                message.call.offeredMemberId &&
                message.call.offeredMemberId !== this.myMemberId
            ) {
                return;
            }
            this.showIncoming(message.call, message.sdpOffer ?? '');
            return;
        }

        if (message.type === 'whatsapp_call_connected' && message.call) {
            const current = this.state.call;
            const sameCall =
                !!current &&
                (current.id === message.call.id ||
                    (!!current.callId && current.callId === message.call.callId));

            if (current && sameCall) {
                this.set({ call: { ...current, ...message.call } });
                void this.applyAnswer(message.sdpAnswer ?? '');
            } else if (message.call.callId && message.sdpAnswer) {
                this.pendingAnswer = {
                    callId: message.call.callId,
                    sdp: message.sdpAnswer,
                };
            }
            return;
        }

        if (message.type === 'whatsapp_call_update' && message.call) {
            if (message.reason === 'claimed' && this.state.phase === 'ringing') {
                this.reset('This call was answered by another agent');
                return;
            }
            if (message.reason === 'reoffered' && this.state.phase === 'ringing') {
                if (
                    !message.call.offeredMemberId ||
                    message.call.offeredMemberId !== this.myMemberId
                ) {
                    this.reset(null);
                }
                return;
            }

            const current = this.state.call;
            if (!current) return;
            if (current.id !== message.call.id && current.callId !== message.call.callId) {
                return;
            }

            if (
                ['COMPLETED', 'MISSED', 'FAILED', 'REJECTED'].includes(
                    message.call.status,
                )
            ) {
                this.reset(null);
            } else {
                this.set({ call: { ...current, ...message.call } });
            }
        }
    }

    // ---- outbound ---------------------------------------------------------------

    /**
     * Call the customer from the phone, exactly like the web dashboard does.
     *
     * The phone builds the SDP offer, the API relays it to Meta, and the answer
     * arrives on the socket. Returns a result instead of throwing so the screen
     * that owns the button can show the reason (including the case where the
     * customer never granted call permission and a request was just sent).
     */
    async startOutbound(request: {
        phone: string;
        name?: string | null;
        conversationId?: string | null;
    }): Promise<OutboundCallResult> {
        if (this.state.phase !== 'idle') {
            return { ok: false, message: 'Finish the current call first.' };
        }

        if (!this.callsEnabled) {
            return {
                ok: false,
                message: 'WhatsApp calling is disabled for this workspace.',
            };
        }

        const phone = (request.phone || '').replace(/[^\d+]/g, '');
        if (!/^\+?\d{8,15}$/.test(phone)) {
            return {
                ok: false,
                message: 'This customer does not have a callable phone number.',
            };
        }

        // Show the call surface immediately: building the offer and reaching
        // Meta takes a moment and the agent needs to see something happening.
        this.set({
            phase: 'calling',
            call: {
                id: '',
                callId: '',
                direction: 'BUSINESS_INITIATED',
                status: 'RINGING',
                fromNumber: null,
                toNumber: phone,
                customerName: request.name ?? null,
                durationSeconds: null,
                createdAt: new Date().toISOString(),
            },
            seconds: 0,
            muted: false,
            error: null,
        });

        try {
            const { mediaDevices, RTCPeerConnection } = loadWebRtc();

            const stream = await mediaDevices.getUserMedia({ audio: true });
            this.localStream = stream;

            const peer = new RTCPeerConnection({ iceServers });
            this.peer = peer;

            stream.getTracks().forEach((track: any) =>
                peer.addTrack(track, stream),
            );

            // Audio-only: the remote track plays through the OS, no RTCView.
            peer.addEventListener('track', () => {
                if (this.state.phase === 'connecting') {
                    this.set({ phase: 'active' });
                    this.startTimer();
                }
            });

            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            await waitForIceGathering(peer);

            const sdp = peer.localDescription?.sdp ?? offer.sdp;
            if (!sdp) throw new Error('The device produced no SDP offer');

            const row = await callsService.initiate({
                to: phone,
                sdp,
                conversationId: request.conversationId ?? null,
            });

            if (row) {
                this.set({ call: row, phase: 'connecting' });
            }

            // Meta may have answered while the POST was in flight.
            const early = this.pendingAnswer;
            if (early && row && early.callId === row.callId) {
                this.pendingAnswer = null;
                await this.applyAnswer(early.sdp);
            }

            return { ok: true };
        } catch (error) {
            console.error('[CallManager] Outbound call failed:', error);
            const apiError = error as {
                message?: string;
                data?: { requiresPermission?: boolean };
            };

            await this.cleanupMedia();
            this.reset(null);

            return {
                ok: false,
                message:
                    apiError?.message ??
                    'Could not start the call. Check the WhatsApp connection.',
                requiresPermission: apiError?.data?.requiresPermission === true,
            };
        }
    }

    /** Apply Meta's SDP answer to the outbound peer connection. */
    private async applyAnswer(sdp: string) {
        const peer = this.peer;
        if (!peer || !sdp) {
            this.set({ error: 'The call answer did not arrive.' });
            return;
        }

        try {
            const { RTCSessionDescription } = loadWebRtc();
            await peer.setRemoteDescription(
                new RTCSessionDescription({ type: 'answer', sdp }),
            );
            this.set({ phase: 'active' });
            this.startTimer();
        } catch (error) {
            console.error(
                '[CallManager] Could not apply the call answer:',
                error,
            );
            this.set({ error: 'The audio connection could not be established.' });
        }
    }

    private showIncoming(call: WhatsAppCallRow, sdpOffer: string) {
        if (this.state.phase !== 'idle') return;
        if (!this.callsEnabled) return;

        this.offerSdp = sdpOffer;
        this.set({ phase: 'ringing', call, seconds: 0, muted: false, error: null });

        // A call never sounds like a chat notification: this is the looping
        // ringtone, and it stops the moment the call is answered or ends.
        ringtone.start();

        // Decline locally before Meta's 30–60 s window expires, so the customer
        // sees a clean "not answered" instead of a timeout.
        this.clearRingTimer();
        this.ringTimer = setTimeout(() => {
            if (this.state.phase === 'ringing') {
                void this.decline();
            }
        }, this.ringTimeoutSeconds * 1000);
    }

    // ---- agent actions ---------------------------------------------------------

    async accept() {
        const call = this.state.call;
        if (!call || this.state.phase !== 'ringing' || !this.offerSdp) return;

        this.clearRingTimer();
        this.set({ phase: 'connecting', error: null });
        // Answered (or about to be): silence the ring before the audio path opens.
        ringtone.stop();

        try {
            const claimed = await callsService.claim(call.id);
            if (claimed) this.set({ call: claimed });

            // Simulated calls (`sim.` ids from the test endpoint) have a placeholder
            // offer and no media path. Touching WebRTC here would throw on the
            // invalid SDP, so accept locally and let the UI run its normal course.
            if (call.callId?.startsWith('sim.')) {
                await callsService.answer(
                    call.id,
                    'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=Simulated answer\r\nt=0 0\r\n',
                );
                this.set({ phase: 'active' });
                this.startTimer();
                return;
            }

            const { mediaDevices, RTCPeerConnection, RTCSessionDescription } =
                loadWebRtc();

            const stream = await mediaDevices.getUserMedia({ audio: true });
            this.localStream = stream;

            const peer = new RTCPeerConnection({ iceServers });
            this.peer = peer;

            stream.getTracks().forEach((track: any) => peer.addTrack(track, stream));

            // Audio-only: the remote track plays through the OS, no RTCView needed.
            peer.addEventListener('track', () => {
                this.set({ phase: 'active' });
                this.startTimer();
            });

            await peer.setRemoteDescription(
                new RTCSessionDescription({ type: 'offer', sdp: this.offerSdp }),
            );
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);

            if (!answer.sdp) {
                throw new Error('The device produced no SDP answer');
            }
            await callsService.answer(call.id, answer.sdp);
            this.set({ phase: 'active' });
            this.startTimer();
        } catch (error) {
            console.error('[CallManager] Accept failed:', error);
            this.set({ error: 'Could not start the call.', phase: 'ringing' });
            await this.cleanupMedia();
            // Best effort: give the call back instead of leaving it ringing.
            void callsService.reject(call.id, 'Accept failed on mobile').catch(() => { });
            this.reset('Could not start the call.');
        }
    }

    async decline() {
        const call = this.state.call;
        this.clearRingTimer();
        if (call) {
            void callsService.reject(call.id, 'Declined from the mobile app').catch(() => { });
        }
        await this.cleanupMedia();
        this.reset(null);
    }

    async hangUp() {
        const call = this.state.call;
        await this.cleanupMedia();
        if (call) {
            void callsService.terminate(call.id).catch(() => { });
        }
        this.reset(null);
    }

    toggleMute() {
        const stream = this.localStream;
        if (!stream) return;
        const next = !this.state.muted;
        stream.getAudioTracks().forEach((track: any) => {
            track.enabled = !next;
        });
        this.set({ muted: next });
    }

    // ---- internals -------------------------------------------------------------

    private startTimer() {
        if (this.timer) return;
        this.timer = setInterval(() => {
            this.set({ seconds: this.state.seconds + 1 });
        }, 1000);
    }

    private clearRingTimer() {
        if (this.ringTimer) {
            clearTimeout(this.ringTimer);
            this.ringTimer = null;
        }
    }

    private async cleanupMedia() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.clearRingTimer();
        ringtone.stop();

        this.localStream?.getTracks?.().forEach((track: any) => track.stop());
        this.localStream = null;

        if (this.peer) {
            try {
                this.peer.close();
            } catch {
                /* already closed */
            }
            this.peer = null;
        }
    }

    private reset(error: string | null) {
        void this.cleanupMedia();
        this.offerSdp = null;
        this.pendingAnswer = null;
        this.set({
            phase: 'idle',
            call: null,
            seconds: 0,
            muted: false,
            error,
        });
    }
}

export const callManager = new CallManager();
export default callManager;
