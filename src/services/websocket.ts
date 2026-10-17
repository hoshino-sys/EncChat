import { ChatMessage, PeerUser, ConnectionState } from '../types/chat';
import { getDefaultWsUrl } from './apiConfig';

export interface WebSocketCallbacks {
  onMessage: (message: ChatMessage) => void;
  onHistory: (messages: ChatMessage[]) => void;
  onPeersUpdate: (peers: PeerUser[]) => void;
  onStatusChange: (status: ConnectionState) => void;
  onSystemNotice: (text: string) => void;
  onMessagesRead?: (messageIds: string[], readerName: string, readAt: number) => void;
  onUpdateAvailable?: (versionInfo: any) => void;
}

export class ChatNetworkService {
  private ws: WebSocket | null = null;
  private callbacks: WebSocketCallbacks;
  private roomId: string = '';
  private userId: string = '';
  private userName: string = '';
  private authHash: string = '';
  private wsUrl: string = '';
  private reconnectTimer: number | null = null;
  private pingInterval: number | null = null;
  private connectTimeoutTimer: number | null = null;
  private pongTimeoutTimer: number | null = null;
  private isExplicitlyClosed: boolean = false;
  private broadcastChannel: BroadcastChannel | null = null;
  private pendingOutbox: any[] = [];
  private reconnectAttempts: number = 0;
  private lastMessageReceivedAt: number = Date.now();
  private isListenersAttached: boolean = false;

  constructor(callbacks: WebSocketCallbacks) {
    this.callbacks = callbacks;
  }

  public connect(roomId: string, userId: string, userName: string, authHash?: string, customWsUrl?: string) {
    this.isExplicitlyClosed = false;
    this.roomId = roomId;
    this.userId = userId;
    this.userName = userName;
    this.authHash = authHash || '';

    this.attachAppLifecycleListeners();

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
    if (customWsUrl) {
      this.wsUrl = customWsUrl;
    } else {
      this.wsUrl = getDefaultWsUrl();
    }

    this.initWebSocket();
  }

  private initWebSocket() {
    if (this.isExplicitlyClosed) return;

    // Clean up any existing connection attempt or timer
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer);
      this.connectTimeoutTimer = null;
    }

    this.callbacks.onStatusChange('connecting');

    try {
      let finalUrl = this.wsUrl;
      try {
        const u = new URL(this.wsUrl);
        u.searchParams.set('roomId', this.roomId);
        finalUrl = u.toString();
      } catch {
        finalUrl = `${this.wsUrl}${this.wsUrl.includes('?') ? '&' : '?'}roomId=${encodeURIComponent(this.roomId)}`;
      }

      this.ws = new WebSocket(finalUrl);

      // 5-second connection handshake timeout guard against hanging/half-open TCP
      this.connectTimeoutTimer = window.setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.warn('[WebSocket] Connection handshake timed out (5s), retrying...');
          try {
            this.ws.close();
          } catch {}
        }
      }, 5000);

      this.ws.onopen = () => {
        if (this.connectTimeoutTimer) {
          clearTimeout(this.connectTimeoutTimer);
          this.connectTimeoutTimer = null;
        }

        if (this.isExplicitlyClosed) {
          this.ws?.close();
          return;
        }

        this.reconnectAttempts = 0;
        this.lastMessageReceivedAt = Date.now();
        this.callbacks.onStatusChange('connected');
        this.startHeartbeat();

        // Send join packet
        this.sendRaw({
          type: 'join',
          roomId: this.roomId,
          userId: this.userId,
          userName: this.userName,
          authHash: this.authHash,
        });

        // Flush all pending outbox messages immediately upon connection
        this.flushPendingOutbox();
      };

      this.ws.onmessage = (event) => {
        this.lastMessageReceivedAt = Date.now();
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingRaw(data, false);
        } catch (e) {
          console.error('Failed to parse incoming WebSocket message', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
      };

      this.ws.onclose = () => {
        if (this.connectTimeoutTimer) {
          clearTimeout(this.connectTimeoutTimer);
          this.connectTimeoutTimer = null;
        }
        this.stopHeartbeat();
        if (!this.isExplicitlyClosed) {
          this.callbacks.onStatusChange('connecting');
          // Reconnect with fast backoff
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
              isSelf: data.message.senderName === this.userName || data.message.senderId === this.userId,
            });
          }
        }
        break;

      case 'history':
        if (Array.isArray(data.messages)) {
          const list = data.messages.map((m: any) => ({
            ...m,
            isSelf: m.senderName === this.userName || m.senderId === this.userId,
          }));
          this.callbacks.onHistory(list);
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

      case 'messages_read':
        if (Array.isArray(data.messageIds)) {
          this.callbacks.onMessagesRead?.(data.messageIds, data.readerName, data.readAt || Date.now());
        }
        break;

      case 'pong':
        this.lastMessageReceivedAt = Date.now();
        if (this.pongTimeoutTimer) {
          clearTimeout(this.pongTimeoutTimer);
          this.pongTimeoutTimer = null;
        }
        break;

      case 'auth_error':
        this.callbacks.onSystemNotice(`身份校验未过: ${data.error || '未授权'}`);
        break;

      case 'update_available':
      case 'version_info':
        this.callbacks.onUpdateAvailable?.(data);
        break;
    }
  }

  public markMessagesRead(messageIds: string[]) {
    if (!messageIds || messageIds.length === 0) return;
    const packet = {
      type: 'mark_read',
      roomId: this.roomId,
      messageIds,
      readerName: this.userName,
      timestamp: Date.now(),
    };

    this.sendRaw(packet);

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'messages_read',
          messageIds,
          readerName: this.userName,
          readAt: Date.now(),
        });
      } catch (e) {
        console.warn('BroadcastChannel mark_read error:', e);
      }
    }
  }

  private scheduleReconnect() {
    if (this.isExplicitlyClosed) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    // Staged fast exponential backoff: 300ms, 800ms, 1500ms, 3000ms max
    const delays = [300, 800, 1500, 3000];
    const delay = delays[Math.min(this.reconnectAttempts, delays.length - 1)];
    this.reconnectAttempts++;

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.initWebSocket();
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = window.setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      // Zombie connection check: if no message received for > 20s, force reconnect
      if (Date.now() - this.lastMessageReceivedAt > 20000) {
        console.warn('[WebSocket] Zombie connection detected (idle > 20s), rebuilding socket...');
        try {
          this.ws.close();
        } catch {}
        return;
      }

      this.sendRaw({ type: 'ping' });

      // Pong response watchdog: if server does not respond within 5s, reconnect
      if (this.pongTimeoutTimer) clearTimeout(this.pongTimeoutTimer);
      this.pongTimeoutTimer = window.setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN && Date.now() - this.lastMessageReceivedAt > 12000) {
          console.warn('[WebSocket] Pong heartbeat timeout (5s), rebuilding socket...');
          try {
            this.ws.close();
          } catch {}
        }
      }, 5000);
    }, 12000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.pongTimeoutTimer) {
      clearTimeout(this.pongTimeoutTimer);
      this.pongTimeoutTimer = null;
    }
  }

  private attachAppLifecycleListeners() {
    if (this.isListenersAttached) return;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleVisibilityOrOnline);
      document.addEventListener('visibilitychange', this.handleVisibilityOrOnline);
      this.isListenersAttached = true;
    }
  }

  private detachAppLifecycleListeners() {
    if (!this.isListenersAttached) return;
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleVisibilityOrOnline);
      document.removeEventListener('visibilitychange', this.handleVisibilityOrOnline);
      this.isListenersAttached = false;
    }
  }

  private handleVisibilityOrOnline = () => {
    if (this.isExplicitlyClosed) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

    if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
      console.log('[WebSocket] Network online or app resumed to foreground. Immediate reconnect...');
      this.reconnect();
    } else if (this.ws.readyState === WebSocket.OPEN) {
      // Test socket health immediately
      this.sendRaw({ type: 'ping' });
    }
  };

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
      try {
        this.ws.send(JSON.stringify(data));
      } catch (err) {
        console.warn('ws.send failed, enqueuing to pending outbox:', err);
        this.pendingOutbox.push(data);
      }
    } else {
      // Retain message in pending outbox so it is NEVER swallowed during connection/reconnection
      this.pendingOutbox.push(data);
    }
  }

  private flushPendingOutbox() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    while (this.pendingOutbox.length > 0) {
      const item = this.pendingOutbox.shift();
      try {
        this.ws.send(JSON.stringify(item));
      } catch (e) {
        console.warn('Failed to flush outbox item, requeueing:', e);
        this.pendingOutbox.unshift(item);
        break;
      }
    }
  }

  public getWsUrl(): string {
    return this.wsUrl;
  }

  public reconnect() {
    this.isExplicitlyClosed = false;
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.initWebSocket();
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    this.detachAppLifecycleListeners();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer);
      this.connectTimeoutTimer = null;
    }
    this.stopHeartbeat();

    if (this.ws) {
      this.sendRaw({
        type: 'leave',
        roomId: this.roomId,
        userId: this.userId,
        userName: this.userName,
      });
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    this.callbacks.onStatusChange('disconnected');
  }
}
