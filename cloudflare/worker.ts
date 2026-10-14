/**
 * Cloudflare Worker with Durable Objects for E2EE Zero-Knowledge WebSocket Room Relay
 * With Fixed Roster Authentication: '夜星' (Admin) & '小夜星' (User)
 */

export interface Env {
  CHAT_ROOM: DurableObjectNamespace;
}

const ALLOWED_USERS = ['夜星', '小夜星'] as const;
type AllowedUser = typeof ALLOWED_USERS[number];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

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
          ...CORS_HEADERS
        }
      });
    }

    // Default room ID for the private chamber
    const roomId = url.searchParams.get('roomId') || 'encchat-sanctuary';
    const id = env.CHAT_ROOM.idFromName(roomId);
    const roomObject = env.CHAT_ROOM.get(id);

    // API endpoints or WebSocket routed to Durable Object
    if (url.pathname.startsWith('/api/') || url.pathname === '/ws') {
      return roomObject.fetch(request);
    }

    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
  }
};

interface SessionMeta {
  userId: string;
  userName: AllowedUser;
  role: 'admin' | 'user';
  joinedAt: number;
}

/**
 * ChatRoom Durable Object
 * Manages authenticated active WebSockets and user password states in SQLite storage.
 * Zero message content storage.
 */
export class ChatRoom {
  private state: DurableObjectState;
  private sessions: Map<WebSocket, SessionMeta>;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sessions = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // API 1: Query account password existence
    if (url.pathname === '/api/account-status') {
      const username = url.searchParams.get('username') as AllowedUser;
      if (!username || !ALLOWED_USERS.includes(username)) {
        return new Response(JSON.stringify({
          valid: false,
          error: '非预设席位'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }

      const storedPwd = await this.state.storage.get<string>(`pwd_${username}`);
      const role = username === '夜星' ? 'admin' : 'user';

      return new Response(JSON.stringify({
        valid: true,
        username,
        role,
        hasPassword: Boolean(storedPwd)
      }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    // API 2: Authenticate or initialize password
    if (url.pathname === '/api/auth') {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
      }

      try {
        const body = await request.json() as {
          username?: AllowedUser;
          passwordHash?: string;
          isFirstTime?: boolean;
        };

        const { username, passwordHash, isFirstTime } = body;
        if (!username || !ALLOWED_USERS.includes(username) || !passwordHash) {
          return new Response(JSON.stringify({
            success: false,
            error: '席位或密印格式有误'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
          });
        }

        const role = username === '夜星' ? 'admin' : 'user';
        const existingPwd = await this.state.storage.get<string>(`pwd_${username}`);

        if (isFirstTime) {
          if (existingPwd) {
            return new Response(JSON.stringify({
              success: false,
              error: '该席位密印已固化，不可重复设定'
            }), {
              status: 403,
              headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
            });
          }

          // Permanently store password hash
          await this.state.storage.put(`pwd_${username}`, passwordHash);
          await this.state.storage.put(`role_${username}`, role);

          return new Response(JSON.stringify({
            success: true,
            username,
            role,
            isFirstTimeSet: true
          }), {
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
          });
        } else {
          // Regular login
          if (!existingPwd) {
            return new Response(JSON.stringify({
              success: false,
              needSetup: true,
              error: '该席位初次使用，请设定密印'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
            });
          }

          if (existingPwd !== passwordHash) {
            return new Response(JSON.stringify({
              success: false,
              error: '密印有误，无法入席'
            }), {
              status: 401,
              headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
            });
          }

          return new Response(JSON.stringify({
            success: true,
            username,
            role
          }), {
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
          });
        }
      } catch (err: any) {
        return new Response(JSON.stringify({
          success: false,
          error: '请求解析失败: ' + err.message
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }
    }

    // API 3: WebSocket connection
    if (url.pathname === '/ws') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
        return new Response('Expected WebSocket Upgrade', { status: 426, headers: CORS_HEADERS });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      server.accept();
      this.setupSession(server);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
  }

  private setupSession(ws: WebSocket) {
    ws.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (!data || !data.type) return;

        switch (data.type) {
          case 'join': {
            const requestedName = data.userName as AllowedUser;
            if (!requestedName || !ALLOWED_USERS.includes(requestedName)) {
              ws.send(JSON.stringify({
                type: 'auth_error',
                error: '非预设席位，拒绝入席'
              }));
              ws.close(4001, 'Unauthorized');
              return;
            }

            // Verify auth hash if configured
            const storedPwd = await this.state.storage.get<string>(`pwd_${requestedName}`);
            if (storedPwd && data.authHash && data.authHash !== storedPwd) {
              ws.send(JSON.stringify({
                type: 'auth_error',
                error: '密印校验失败'
              }));
              ws.close(4003, 'Invalid credentials');
              return;
            }

            const role = requestedName === '夜星' ? 'admin' : 'user';

            // Clean up any stale socket with the same user name
            for (const [existingSocket, meta] of this.sessions.entries()) {
              if (meta.userName === requestedName && existingSocket !== ws) {
                try {
                  existingSocket.close(4000, 'Replaced by new connection');
                } catch {}
                this.sessions.delete(existingSocket);
              }
            }

            this.sessions.set(ws, {
              userId: data.userId || `u_${Math.random().toString(36).substring(2, 9)}`,
              userName: requestedName,
              role,
              joinedAt: Date.now(),
            });

            this.broadcastPeers();
            this.broadcast({
              type: 'join_notice',
              userId: data.userId,
              userName: requestedName
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
      role: s.role,
      joinedAt: s.joinedAt
    }));
    this.broadcast({ type: 'peers', peers });
  }
}
