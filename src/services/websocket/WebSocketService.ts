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
      mode: 'AI_ACTIVE' | 'HUMAN_TAKEOVER' | 'AI_PAUSED';
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
   * Connect to WebSocket server
   */
  connect(apiBaseUrl: string, authToken: string) {
    this.token = authToken;
    this.destroyed = false;

    // Convert HTTP URL to WebSocket URL
    const wsBaseUrl = apiBaseUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    const wsUrl = `${wsBaseUrl}/ws`;

    console.log('🔌 Connecting to WebSocket:', wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        if (this.ws && this.token) {
          // Subscribe to admin events
          this.ws.send(
            JSON.stringify({
              type: 'subscribe_admin',
              payload: { token: this.token },
            }),
          );
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 WebSocket message:', message.type);
          
          // Notify all handlers
          this.messageHandlers.forEach((handler) => handler(message));
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket closed');
        this.ws = null;
        
        // Auto-reconnect after 5 seconds if not destroyed
        if (!this.destroyed) {
          console.log('🔄 Reconnecting in 5 seconds...');
          this.reconnectTimer = setTimeout(() => {
            if (this.token && apiBaseUrl) {
              this.connect(apiBaseUrl, this.token);
            }
          }, 5000);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
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
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
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
