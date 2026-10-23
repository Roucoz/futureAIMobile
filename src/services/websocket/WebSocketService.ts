/**
 * WebSocket Service
 * Handles real-time message updates via WebSocket connection
 */

type WebSocketMessage =
  | {
    type: 'conversation_updated';
    conversation: any;
    newMessage?: any;
  }
  | {
    type: 'conversation_mode_updated';
    conversationId: string;
    mode: 'AI_ACTIVE' | 'HUMAN_TAKEOVER' | 'AI_PAUSED' | 'ORDER_IN_PROGRESS';
  }
  | {
    type: 'typing_start';
    conversationId: string;
    source: 'ai' | 'visitor';
  }
  | {
    type: 'typing_stop';
    conversationId: string;
    source: 'ai' | 'visitor';
  }
  | {
    type: 'escalation_request';
    conversationId: string;
    visitorId: string;
    suggestedAgent?: string | null;
    reason?: string;
    timestamp: string;
  }
  | {
    type: 'conversation_closed';
    conversationId: string;
  }
  | {
    type: 'conversation_assignment_changed';
    conversationId: string;
    visitorId: string;
    assignedToMemberId: string | null;
    assignedToMemberName?: string;
    action: 'claimed' | 'released';
    timestamp: string;
  }
  | {
    type: 'agent_status_changed';
    agentId: string;
    agentName: string;
    status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'AWAY';
    timestamp: string;
  }
  | {
    type: 'appointment_updated';
    action: 'created' | 'updated' | 'canceled' | 'status_changed';
    appointment: {
      id: string;
      customerName: string;
      appointmentDate: string;
      status: string;
      serviceName?: string;
      durationMinutes?: number;
    };
    timestamp: string;
  }
  | {
    type: 'order_updated';
    action: 'created' | 'updated' | 'canceled' | 'status_changed';
    order: {
      id: string;
      customerName: string;
      status: string;
      totalAmount?: number | null;
      conversationId?: string | null;
    };
    timestamp: string;
  }
  | {
    type: 'ws_reconnected';
  }
  | {
    type: 'whatsapp_call_incoming';
    projectId?: string;
    call: any;
    sdpOffer?: string;
  }
  | {
    type: 'whatsapp_call_update';
    projectId?: string;
    call: any;
    reason?: 'claimed' | 'reoffered';
  }
  | {
    type: 'whatsapp_call_connected';
    projectId?: string;
    call: any;
    sdpAnswer?: string;
  }
  | {
    type: 'session_terminated';
    reason: string;
    message: string;
    timestamp: string;
  };

type MessageHandler = (message: WebSocketMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private messageHandlers: MessageHandler[] = [];

  constructor() {
    // WebSocket service initialized
  }

  /**
   * Close a socket without ever throwing.
   *
   * React Native raises `INVALID_STATE_ERR` when `close()` is called on a socket
   * that is still CONNECTING (or already CLOSED), and that error surfaced as an
   * unhandled red box. Connecting sockets are deferred instead: closing them as
   * soon as they open is the only safe way to cancel them.
   */
  private closeSocket(socket: WebSocket | null) {
    if (!socket) return;

    try {
      // 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED.
      if (socket.readyState === 0) {
        // Cancel on open; the deferred handler ignores the subscription.
        socket.onopen = () => {
          try {
            socket.close();
          } catch {
            // Already gone.
          }
        };
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        return;
      }

      if (socket.readyState === 1 || socket.readyState === 2) {
        socket.close();
      }
    } catch {
      // A socket that refuses to close is already unusable; drop the reference.
    }
  }

  /**
   * Send without ever throwing.
   *
   * React Native's WebSocket raises `INVALID_STATE_ERR` from `send()` when the
   * native socket is not open — including the race where it closes between our
   * `readyState` check and the call. A dropped subscribe is recoverable; an
   * uncaught throw inside `onopen` is not.
   */
  private safeSend(socket: WebSocket, data: string) {
    try {
      // 1 = OPEN
      if (socket.readyState !== 1) return;
      socket.send(data);
    } catch (error) {
      console.warn('[WS] send skipped:', error);
    }
  }

  /** One misbehaving subscriber must not break the socket or its siblings. */
  private notify(message: WebSocketMessage) {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('[WS] handler failed:', error);
      }
    });
  }

  /**
   * Connect to WebSocket server
   */
  connect(apiBaseUrl: string, authToken: string) {
    this.token = authToken;
    this.destroyed = false;

    // One live connection only. Without this, every screen that re-ran setup
    // opened another socket and the previous ones were closed mid-handshake,
    // which is exactly what produced INVALID_STATE_ERR.
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Convert HTTP URL to WebSocket URL
    const wsBaseUrl = apiBaseUrl
      .replace('http://', 'ws://')
      .replace('https://', 'wss://');
    const wsUrl = `${wsBaseUrl}/ws`;

    console.log('🔌 Connecting to WebSocket:', wsUrl);

    try {
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        console.log('✅ WebSocket connected');
        // The socket may already have been replaced by a newer connect().
        if (this.ws !== socket) return;

        if (socket.readyState === WebSocket.OPEN && this.token) {
          // Subscribe to admin events
          this.safeSend(
            socket,
            JSON.stringify({
              type: 'subscribe_admin',
              payload: { token: this.token, clientType: 'mobile' },
            }),
          );
        }
        // Notify handlers that WebSocket reconnected so they can reload data
        this.notify({ type: 'ws_reconnected' } as WebSocketMessage);
      };

      socket.onmessage = event => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 WebSocket message:', message.type);

          // Notify all handlers
          this.notify(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      socket.onerror = error => {
        console.error('❌ WebSocket error:', error);
      };

      socket.onclose = () => {
        console.log('🔌 WebSocket closed');
        // Only the CURRENT socket may clear the reference or schedule a
        // reconnect: a stale socket closing must not kill a live connection.
        if (this.ws !== socket) return;
        this.ws = null;

        // Auto-reconnect after 5 seconds if not destroyed
        if (!this.destroyed && !this.reconnectTimer) {
          console.log('🔄 Reconnecting in 5 seconds...');
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.token && apiBaseUrl) {
              this.connect(apiBaseUrl, this.token);
            }
          }, 5000);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.ws = null;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    this.destroyed = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const socket = this.ws;
    this.ws = null;
    this.closeSocket(socket);

    console.log('🔌 WebSocket disconnected');
  }

  /**
   * Subscribe to WebSocket messages
   */
  subscribe(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) {
        this.messageHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService;
