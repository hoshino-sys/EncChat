import { ChatMessage, PeerUser, ConnectionState } from '../types/chat';

export interface WebSocketCallbacks {
  onMessage: (message: ChatMessage) => void;
  onPeersUpdate: (peers: PeerUser[]) => void;
  onStatusChange: (status: ConnectionState) => void;
  onSystemNotice: (text: string) => void;
}

export class ChatNetworkService {
  private ws: WebSocket | null = null;
  private callbacks: WebSocketCallbacks;
  private roomId: string = '';
  private userId: string = '';
  private userName: string = '';
  private wsUrl: string = '';
  private reconnectTimer: number | null = null;
  private pingInterval: number | null = null;
  private isExplicitlyClosed: boolean = false;
  private broadcastChannel: BroadcastChannel | null = null;

  constructor(callbacks: WebSocketCallbacks) {
    this.callbacks = callbacks;
  }

  public connect(roomId: string, userId: string, userName: string, customWsUrl?: string) {
    this.isExplicitlyClosed = false;
    this.roomId = roomId;
    this.userId = userId;
    this.userName = userName;

    // Initialize BroadcastChannel for instant local cross-tab / cross-window sync
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        if (this.broadcastChannel) {
          this.broadcastChannel.close();
        }
        this.broadcastChannel = new BroadcastChannel(`encchat-room-${roomId}`);
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingRaw(event.data, true);
        };
      } catch (e) {
        console.warn('BroadcastChannel not available:', e);
      }
    }

    // Determine WebSocket endpoint
    const savedCustomUrl = typeof window !== 'undefined' ? localStorage.getItem('encchat_custom_ws_url') : null;
    const envWsUrl = import.meta.env.VITE_WS_URL;

    if (customWsUrl) {
      this.wsUrl = customWsUrl;
    } else if (savedCustomUrl && savedCustomUrl.trim()) {
      this.wsUrl = savedCustomUrl.trim();
    } else if (envWsUrl && envWsUrl.trim()) {
      this.wsUrl = envWsUrl.trim();
    } else {
      const isHttps = window.location.protocol === 'https:';
      const wsProto = isHttps ? 'wss:' : 'ws:';
      
      // If running on Vite dev server (port 5173), default relay to local 8787
      if (window.location.port === '5173') {
        this.wsUrl = `${wsProto}//${window.location.hostname}:8787/ws`;
      } else {
        // In Cloudflare Pages / custom domain, connect directly to our deployed Cloudflare Worker relay
        this.wsUrl = 'wss://encchat-relay.19860620884.workers.dev/ws';
      }
    }

    this.initWebSocket();
  }

  private initWebSocket() {
    if (this.isExplicitlyClosed) return;

    this.callbacks.onStatusChange('connecting');

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        if (this.isExplicitlyClosed) {
          this.ws?.close();
          return;
        }
        this.callbacks.onStatusChange('connected');
        this.startHeartbeat();

        // Send join packet
        this.sendRaw({
          type: 'join',
          roomId: this.roomId,
          userId: this.userId,
          userName: this.userName,
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingRaw(data, false);
        } catch (e) {
          console.error('Failed to parse incoming WebSocket message', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
        // Do not immediately fail; onclose will handle reconnect
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        if (!this.isExplicitlyClosed) {
          this.callbacks.onStatusChange('connecting');
          // Reconnect with backoff
          this.scheduleReconnect();
        } else {
          this.callbacks.onStatusChange('disconnected');
        }
      };
    } catch (err) {
      console.warn('Could not connect to WebSocket relay server:', err);
      this.callbacks.onStatusChange('error');
      this.scheduleReconnect();
    }
  }

  private handleIncomingRaw(data: any, _fromBroadcast: boolean) {
    if (!data || typeof data !== 'object') return;

    switch (data.type) {
      case 'message':
        if (data.message) {
          // Check if it's from this room
          if (data.message.roomId === this.roomId) {
            this.callbacks.onMessage({
              ...data.message,
              isSelf: data.message.senderId === this.userId,
            });
          }
        }
        break;

      case 'peers':
        if (Array.isArray(data.peers)) {
          this.callbacks.onPeersUpdate(data.peers);
        }
        break;

      case 'join_notice':
        if (data.userName && data.userId !== this.userId) {
          this.callbacks.onSystemNotice(`${data.userName} 加入了房间`);
        }
        break;

      case 'leave_notice':
        if (data.userName && data.userId !== this.userId) {
          this.callbacks.onSystemNotice(`${data.userName} 离开了房间`);
        }
        break;

      case 'name_change':
        if (data.userId && data.newName) {
          this.callbacks.onSystemNotice(`${data.oldName || '成员'} 改名为 ${data.newName}`);
        }
        break;

      case 'pong':
        // Heartbeat received
        break;
    }
  }

  private scheduleReconnect() {
    if (this.isExplicitlyClosed) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    this.reconnectTimer = window.setTimeout(() => {
      this.initWebSocket();
    }, 3000);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = window.setInterval(() => {
      this.sendRaw({ type: 'ping' });
    }, 20000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public sendMessage(message: ChatMessage) {
    const packet = {
      type: 'message',
      roomId: this.roomId,
      message,
    };

    // Send via WebSocket
    this.sendRaw(packet);

    // Also dispatch to local BroadcastChannel for same-origin tabs
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(packet);
      } catch (e) {
        console.warn('BroadcastChannel postMessage error:', e);
      }
    }
  }

  public updateUserName(newName: string) {
    const oldName = this.userName;
    this.userName = newName;
    const packet = {
      type: 'name_change',
      roomId: this.roomId,
      userId: this.userId,
      oldName,
      newName,
    };
    this.sendRaw(packet);
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(packet);
      } catch (e) {
        console.warn('BroadcastChannel postMessage error:', e);
      }
    }
  }

  private sendRaw(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();

    if (this.ws) {
      this.sendRaw({
        type: 'leave',
        roomId: this.roomId,
        userId: this.userId,
        userName: this.userName,
      });
      this.ws.close();
      this.ws = null;
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    this.callbacks.onStatusChange('disconnected');
  }
}
