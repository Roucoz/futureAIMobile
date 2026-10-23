import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import callManager, { CallState } from '../../services/calls/callManager';

const formatClock = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/**
 * Full-screen call surface.
 *
 * A dumb view over `callManager`: it never touches WebRTC itself, so the state
 * machine can be driven by the websocket, the pending-call recovery and the
 * buttons alike.
 *
 * Foreground only — a call that arrives while the app is closed shows as a push
 * notification and is picked up by `recoverPendingCall()` when the agent opens
 * the app.
 */
export const CallOverlay = () => {
  const [state, setState] = useState<CallState>(callManager.getState());

  useEffect(() => callManager.subscribe(setState), []);

  if (state.phase === 'idle') return null;

  const call = state.call;
  const counterpart =
    call?.direction === 'BUSINESS_INITIATED'
      ? call?.toNumber
      : call?.fromNumber;
  const caller = call?.customerName || counterpart || 'WhatsApp customer';
  const isOutbound = call?.direction === 'BUSINESS_INITIATED';

  const title =
    state.phase === 'active'
      ? 'Call in progress'
      : state.phase === 'calling'
      ? 'Starting WhatsApp call…'
      : state.phase === 'connecting'
      ? isOutbound
        ? 'Calling…'
        : 'Connecting…'
      : 'Incoming WhatsApp call';

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>📞</Text>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.caller}>{caller}</Text>
          {call?.customerName && counterpart ? (
            <Text style={styles.subtle}>{counterpart}</Text>
          ) : null}

          {state.phase === 'active' && (
            <Text style={styles.timer}>{formatClock(state.seconds)}</Text>
          )}

          {state.phase === 'connecting' && (
            <ActivityIndicator style={{ marginTop: 16 }} color="#25D366" />
          )}

          {(state.phase === 'calling' || state.phase === 'connecting') && (
            <Text style={styles.subtle}>
              {isOutbound
                ? 'Waiting for the customer to answer'
                : 'Answering the call'}
            </Text>
          )}

          {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

          <View style={styles.actions}>
            {state.phase === 'ringing' && (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.decline]}
                  onPress={() => void callManager.decline()}
                >
                  <Text style={styles.buttonText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.accept]}
                  onPress={() => void callManager.accept()}
                >
                  <Text style={styles.buttonText}>Accept</Text>
                </TouchableOpacity>
              </>
            )}

            {state.phase === 'connecting' && (
              <TouchableOpacity
                style={[styles.button, styles.decline]}
                onPress={() => void callManager.hangUp()}
              >
                <Text style={styles.buttonText}>
                  {isOutbound ? 'Cancel call' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            )}

            {state.phase === 'calling' && (
              <TouchableOpacity
                style={[styles.button, styles.decline]}
                onPress={() => void callManager.hangUp()}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            )}

            {state.phase === 'active' && (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.secondary]}
                  onPress={() => callManager.toggleMute()}
                >
                  <Text style={styles.buttonText}>
                    {state.muted ? 'Unmute' : 'Mute'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.decline]}
                  onPress={() => void callManager.hangUp()}
                >
                  <Text style={styles.buttonText}>Hang up</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 12, 20, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#121821',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: { fontSize: 34 },
  title: {
    color: '#9aa7b8',
    fontSize: 13,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  caller: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtle: { color: '#7d8a9c', fontSize: 13, marginTop: 4 },
  timer: {
    color: '#25D366',
    fontSize: 32,
    fontWeight: '700',
    marginTop: 14,
    fontVariant: ['tabular-nums'],
  },
  error: { color: '#ff7875', fontSize: 13, marginTop: 12, textAlign: 'center' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 26,
  },
  button: {
    minWidth: 120,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 28,
    alignItems: 'center',
  },
  accept: { backgroundColor: '#25D366' },
  decline: { backgroundColor: '#c0392b' },
  secondary: { backgroundColor: '#2b3543' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});

export default CallOverlay;
