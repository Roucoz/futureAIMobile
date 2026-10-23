/**
 * Incoming-call ringtone (mobile).
 *
 * Same melody the web dashboard uses, so an agent recognises a call from the
 * sound alone — and so it is never mistaken for the short "new chat" blip that
 * notifications use.
 *
 * Two engines, in this order:
 *  1. `react-native-audio-api` (Web Audio API for React Native) — the melody runs
 *     exactly as written.
 *  2. Vibration pattern — the package is native and needs a rebuild, so until it
 *     is installed the phone still tells the agent something is ringing.
 *
 * Loaded lazily: importing a missing native module at startup would take the
 * whole app down.
 */

const midiToFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

const STEP = 0.22; // seconds per step
const LOOP_SECONDS = 4.4; // melody (3.5s) + short pause

const MELODY: (number | null)[] = [
    76, 79, 84, 79, 83, 79, 76, 79, 81, 84, 88, 84, 83, null, 79, null,
];

const BASS = [
    { step: 0, len: 7.5, midi: 48 },
    { step: 8, len: 3.5, midi: 45 },
    { step: 12, len: 3.5, midi: 43 },
];

type AudioContextLike = {
    currentTime: number;
    state?: string;
    destination: unknown;
    createOscillator: () => {
        type: string;
        frequency: { value: number };
        connect: (node: unknown) => void;
        start: (when: number) => void;
        stop: (when: number) => void;
    };
    createGain: () => {
        gain: {
            value: number;
            setValueAtTime: (value: number, when: number) => void;
            exponentialRampToValueAtTime: (value: number, when: number) => void;
        };
        connect: (node: unknown) => void;
    };
    createBiquadFilter?: () => {
        type: string;
        frequency: { value: number };
        connect: (node: unknown) => void;
    };
    createDelay?: () => {
        delayTime: { value: number };
        connect: (node: unknown) => void;
    };
    resume?: () => Promise<void> | void;
    close?: () => Promise<void> | void;
};

/**
 * Web Audio API implementation of the ringtone, portable enough to run on
 * `react-native-audio-api` without changes.
 */
export const createAuroraRingtone = (
    createContext: () => AudioContextLike,
) => {
    let ctx: AudioContextLike | null = null;
    let master: ReturnType<AudioContextLike["createGain"]> | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let volume = 0.7;

    const voice = (
        t: number,
        midi: number,
        dur: number,
        vol: number,
        type: "sine" | "triangle",
    ) => {
        if (!ctx || !master) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = midiToFreq(midi);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(vol, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain);
        gain.connect(master);
        osc.start(t);
        osc.stop(t + dur + 0.05);
    };

    const playLoop = () => {
        if (!ctx) return;
        const t0 = ctx.currentTime + 0.05;

        MELODY.forEach((midi, index) => {
            if (midi === null) return;
            const t = t0 + index * STEP;
            const dur = STEP * 1.7;
            voice(t, midi, dur, 0.22, "triangle");
            voice(t, midi + 12, dur * 0.8, 0.066, "sine"); // shimmer
        });

        BASS.forEach((note) => {
            voice(t0 + note.step * STEP, note.midi, note.len * STEP, 0.2, "sine");
        });
    };

    const start = (nextVolume = 0.7) => {
        if (timer) return;
        volume = nextVolume;

        try {
            ctx = createContext();
            if (ctx.state === "suspended") void ctx.resume?.();

            master = ctx.createGain();
            master.gain.value = volume;

            // Soft low-pass so a phone speaker does not turn it into a screech.
            let out: unknown = master;
            try {
                const filter = ctx.createBiquadFilter?.();
                if (filter) {
                    filter.type = "lowpass";
                    filter.frequency.value = 5000;
                    master.connect(filter);
                    out = filter;
                }
            } catch {
                // Dry signal only.
            }
            (out as { connect: (node: unknown) => void }).connect(ctx.destination);

            // Optional echo, skipped when the engine has no DelayNode.
            try {
                const delay = ctx.createDelay?.();
                if (delay) {
                    delay.delayTime.value = 0.2;
                    const feedback = ctx.createGain();
                    feedback.gain.value = 0.3;
                    const wet = ctx.createGain();
                    wet.gain.value = 0.3;
                    (out as { connect: (node: unknown) => void }).connect(delay);
                    delay.connect(feedback);
                    feedback.connect(delay);
                    delay.connect(wet);
                    wet.connect(ctx.destination);
                }
            } catch {
                // Dry signal only.
            }

            playLoop();
            timer = setInterval(playLoop, LOOP_SECONDS * 1000);
        } catch (error) {
            console.warn("[Ringtone] not available:", error);
            ctx = null;
            master = null;
        }
    };

    const stop = () => {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        const current = ctx;
        if (current) {
            try {
                master?.gain.setValueAtTime(0, current.currentTime); // cut immediately
            } catch {
                // Closing the context below is what actually silences it.
            }
            setTimeout(() => {
                try {
                    void current.close?.();
                } catch {
                    // Already closed.
                }
            }, 150);
        }
        ctx = null;
        master = null;
    };

    const setVolume = (next: number) => {
        volume = next;
        if (master) master.gain.value = next;
    };

    return { start, stop, setVolume, isRinging: () => timer !== null };
};

/** `react-native-audio-api` exposes an AudioContext with the Web Audio shape. */
const loadAudioApi = (): {
    AudioContext?: new () => AudioContextLike;
    AudioManager?: {
        setAudioSessionOptions: (options: {
            iosCategory?: string;
            iosMode?: string;
            iosOptions?: string[];
            iosAllowHaptics?: boolean;
        }) => void;
        setAudioSessionActivity: (enabled: boolean) => Promise<void>;
    };
} | null => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require('react-native-audio-api') as {
            AudioContext?: new () => AudioContextLike;
            AudioManager?: {
                setAudioSessionOptions: (options: {
                    iosCategory?: string;
                    iosMode?: string;
                    iosOptions?: string[];
                    iosAllowHaptics?: boolean;
                }) => void;
                setAudioSessionActivity: (enabled: boolean) => Promise<void>;
            };
        };
    } catch (error) {
        // Not linked yet (native rebuild after `pod install` is still pending).
        console.warn(
            '[Ringtone] react-native-audio-api is not available — ring falls back to vibration:',
            error,
        );
        return null;
    }
};

/**
 * iOS only plays our oscillators once the app's audio session is active.
 *
 * `playback` deliberately ignores the hardware mute switch: a ringtone that
 * goes silent because the phone is on silent is a missed call. `duckOthers`
 * lowers the agent's music instead of stopping it.
 */
const activateAudioSession = (audioApi: NonNullable<ReturnType<typeof loadAudioApi>>) => {
    try {
        audioApi.AudioManager?.setAudioSessionOptions({
            iosCategory: 'playback',
            iosMode: 'default',
            iosOptions: ['duckOthers'],
            iosAllowHaptics: true,
        });
        void audioApi.AudioManager?.setAudioSessionActivity(true).catch((error) => {
            console.warn('[Ringtone] could not activate the audio session:', error);
        });
    } catch (error) {
        console.warn('[Ringtone] audio session setup failed:', error);
    }
};

const VIBRATION_PATTERN = [0, 500, 300, 500, 300, 900];

/**
 * The ringtone used by the call manager. Falls back to a repeating vibration
 * when the audio engine is not installed yet, so a call is never silent.
 */
class CallRingtone {
    private engine: ReturnType<typeof createAuroraRingtone> | null = null;
    private vibrating = false;
    private sessionReady = false;
    /** What produced sound on the last start — read by the dev test button. */
    private mode: 'idle' | 'audio' | 'vibration' = 'idle';

    /** `audio` = the melody plays, `vibration` = fallback, `idle` = silent. */
    getMode() {
        return this.mode;
    }

    private ensureEngine() {
        if (this.engine) return this.engine;

        const audioApi = loadAudioApi();
        if (!audioApi?.AudioContext) return null;

        if (!this.sessionReady) {
            activateAudioSession(audioApi);
            this.sessionReady = true;
        }

        const Ctor = audioApi.AudioContext;
        this.engine = createAuroraRingtone(() => new Ctor());
        return this.engine;
    }

    start(volume = 0.8) {
        const engine = this.ensureEngine();
        if (engine) {
            engine.start(volume);
            // The melody only counts as started if the context actually opened (the
            // native side is missing until the app is rebuilt after `pod install`).
            if (engine.isRinging()) {
                console.log('[Ringtone] melody started');
                this.mode = 'audio';
                return;
            }
            console.warn(
                '[Ringtone] audio engine did not start — using the vibration fallback',
            );
        }

        // No working audio engine: vibrate on a loop instead of ringing silently.
        if (this.vibrating) return;
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { Vibration } = require('react-native') as {
                Vibration: { vibrate: (pattern: number[], repeat?: boolean) => void };
            };
            Vibration.vibrate(VIBRATION_PATTERN, true);
            this.vibrating = true;
            this.mode = 'vibration';
        } catch (error) {
            console.warn('[Ringtone] vibration unavailable:', error);
        }
    }

    stop() {
        this.engine?.stop();
        this.mode = 'idle';
        if (this.vibrating) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const { Vibration } = require('react-native') as {
                    Vibration: { cancel: () => void };
                };
                Vibration.cancel();
            } catch {
                // Nothing to cancel.
            }
            this.vibrating = false;
        }
    }

    isRinging() {
        return this.engine?.isRinging() === true || this.vibrating;
    }
}

export const ringtone = new CallRingtone();
export default ringtone;
