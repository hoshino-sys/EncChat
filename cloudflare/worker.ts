/**
 * Cloudflare Worker with Durable Objects for E2EE Zero-Knowledge WebSocket Room Relay
 */

export interface Env {
  CHAT_ROOM: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health' || url.pathname === '/') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'EncChat Cloudflare Worker Relay',
        e2ee: 'AES-256-GCM',
        serverTime: Date.now()
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // WebSocket endpoint /ws
    if (url.pathname === '/ws') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
        return new Response('Expected WebSocket Upgrade', { status: 426 });
      }

      // Extract roomId from query parameter or default to 'global'
      const roomId = url.searchParams.get('roomId') || 'default-room';

      // Route to Durable Object named by roomId
      const id = env.CHAT_ROOM.idFromName(roomId);
      const roomObject = env.CHAT_ROOM.get(id);

      return roomObject.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  }
};

/**
 * ChatRoom Durable Object
 * Manages active WebSockets in a specific room. Zero message storage.
 */
export class ChatRoom {
  private state: DurableObjectState;
  private sessions: Map<WebSocket, { userId: string; userName: string; joinedAt: number }>;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sessions = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept WebSocket connection on the server side
    server.accept();

    this.setupSession(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private setupSession(ws: WebSocket) {
    ws.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (!data || !data.type) return;

        switch (data.type) {
          case 'join': {
            this.sessions.set(ws, {
              userId: data.userId,
              userName: data.userName || `User-${data.userId.slice(0, 4)}`,
              joinedAt: Date.now(),
            });

            this.broadcastPeers();
            this.broadcast({
              type: 'join_notice',
              userId: data.userId,
              userName: data.userName
            }, ws);
            break;
          }

          case 'message': {
            // Forward ciphertext payload to everyone else in the room
            this.broadcast({
              type: 'message',
              message: data.message
            }, ws);
            break;
          }

          case 'name_change': {
            const current = this.sessions.get(ws);
            if (current) {
              const oldName = current.userName;
              current.userName = data.newName;
              this.broadcast({
                type: 'name_change',
                userId: current.userId,
                oldName,
                newName: data.newName,
              });
              this.broadcastPeers();
            }
            break;
          }

          case 'ping': {
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          }

          case 'leave': {
            this.removeSession(ws);
            break;
          }
        }
      } catch (err) {
        console.error('Error handling WebSocket message in Durable Object:', err);
      }
    });

    const closeHandler = () => {
      this.removeSession(ws);
    };

    ws.addEventListener('close', closeHandler);
    ws.addEventListener('error', closeHandler);
  }

  private removeSession(ws: WebSocket) {
    const session = this.sessions.get(ws);
    if (session) {
      this.sessions.delete(ws);
      this.broadcast({
        type: 'leave_notice',
        userId: session.userId,
        userName: session.userName
      });
      this.broadcastPeers();
    }
  }

  private broadcast(messageObj: any, excludeWs: WebSocket | null = null) {
    const payload = JSON.stringify(messageObj);
    for (const [socket] of this.sessions) {
      if (socket !== excludeWs) {
        try {
          socket.send(payload);
        } catch (e) {
          this.removeSession(socket);
        }
      }
    }
  }

  private broadcastPeers() {
    const peers = Array.from(this.sessions.values()).map(s => ({
      id: s.userId,
      name: s.userName,
      joinedAt: s.joinedAt
    }));
    this.broadcast({ type: 'peers', peers });
  }
}
