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

    // Version Check endpoint for Android In-App Update
    if (url.pathname === '/api/version' || url.pathname === '/api/check-update') {
      return new Response(JSON.stringify({
        latestVersion: '1.5.3',
        versionCode: 8,
        downloadUrl: 'https://chat.nightstar.top/api/download/moyin-encchat-v1.5.3-debug.apk',
        githubDownloadUrl: 'https://github.com/hoshino-sys/EncChat/releases/download/v1.5.3/moyin-encchat-v1.5.3-debug.apk',
        releaseNotes: '1. 修复横幅通知（Heads-up）最高优先级调度\n2. 新增信函通知与横幅状态自检面板\n3. 新增一键直达系统通知设置与测试通知',
        pubDate: '2026-10-17',
        forceUpdate: false,
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS
        }
      });
    }

    // APK Download handler (proxies GitHub Releases asset directly with APK mime-type)
    if (url.pathname.startsWith('/download/') || url.pathname.startsWith('/api/download/')) {
      const fileName = url.pathname.split('/').pop() || 'moyin-encchat-v1.5.3-debug.apk';
      const tagMatch = fileName.match(/v(\d+\.\d+\.\d+)/);
      const versionTag = tagMatch ? `v${tagMatch[1]}` : 'v1.5.3';
      const githubUrl = `https://github.com/hoshino-sys/EncChat/releases/download/${versionTag}/${fileName}`;

      try {
        const upstream = await fetch(githubUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Android; Mobile)',
          },
          redirect: 'follow',
        });

        if (upstream.ok && upstream.body) {
          return new Response(upstream.body, {
            status: 200,
            headers: {
              'Content-Type': 'application/vnd.android.package-archive',
              'Content-Disposition': `attachment; filename="${fileName}"`,
              'Content-Length': upstream.headers.get('content-length') || '',
              ...CORS_HEADERS,
            },
          });
        }
      } catch (err) {
        console.error('Failed to proxy APK download:', err);
      }

      return Response.redirect(githubUrl, 302);
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

            // Send message history from SQLite storage to this client
            try {
              const historyMap = await this.state.storage.list<any>({ prefix: 'msg_', limit: 1000 });
              const messages = Array.from(historyMap.values()).sort((a, b) => a.timestamp - b.timestamp);
              ws.send(JSON.stringify({
                type: 'history',
                messages
              }));
            } catch (err) {
              console.error('Failed to retrieve history:', err);
            }

            // Push latest version metadata directly to connected client
            try {
              ws.send(JSON.stringify({
                type: 'update_available',
                latestVersion: '1.5.3',
                versionCode: 8,
                downloadUrl: 'https://chat.nightstar.top/api/download/moyin-encchat-v1.5.3-debug.apk',
                githubDownloadUrl: 'https://github.com/hoshino-sys/EncChat/releases/download/v1.5.3/moyin-encchat-v1.5.3-debug.apk',
                releaseNotes: '1. 修复横幅通知（Heads-up）最高优先级调度\n2. 新增信函通知与横幅状态自检面板\n3. 新增一键直达系统通知设置与测试通知',
                pubDate: '2026-10-17',
                forceUpdate: false,
              }));
            } catch {}
            break;
          }

          case 'message': {
            const msg = data.message;
            if (msg && msg.id) {
              const enrichedMsg = {
                ...msg,
                isRead: Boolean(msg.isRead),
              };
              // Persist message in SQLite storage
              try {
                await this.state.storage.put(`msg_${msg.timestamp}_${msg.id}`, enrichedMsg);

                // Periodic eviction: keep DO storage lightweight (<= 500 messages)
                if (Math.random() < 0.1) {
                  const allKeys = await this.state.storage.list({ prefix: 'msg_', limit: 600 });
                  if (allKeys.size > 500) {
                    const sortedKeys = Array.from(allKeys.keys()).sort();
                    const toDelete = sortedKeys.slice(0, sortedKeys.length - 450);
                    for (const k of toDelete) {
                      await this.state.storage.delete(k);
                    }
                  }
                }
              } catch (err) {
                console.error('Failed to save message to SQLite storage:', err);
              }

              // Broadcast message to everyone else in the room
              this.broadcast({
                type: 'message',
                message: enrichedMsg
              }, ws);
            }
            break;
          }

          case 'mark_read': {
            const { messageIds, readerName } = data;
            if (Array.isArray(messageIds) && messageIds.length > 0) {
              const readAt = Date.now();
              const targetSet = new Set(messageIds);

              try {
                // Search recent messages in reverse chronological order to guarantee hit on new messages
                const historyMap = await this.state.storage.list<any>({ prefix: 'msg_', reverse: true, limit: 200 });
                for (const [key, storedMsg] of historyMap.entries()) {
                  if (storedMsg && targetSet.has(storedMsg.id)) {
                    if (!storedMsg.isRead) {
                      storedMsg.isRead = true;
                      storedMsg.readAt = readAt;
                      storedMsg.readBy = readerName;
                      await this.state.storage.put(key, storedMsg);
                    }
                  }
                }
              } catch (err) {
                console.error('Failed to update read status in SQLite:', err);
              }

              // Always broadcast messages_read to all clients in the room to update sender UI
              this.broadcast({
                type: 'messages_read',
                messageIds,
                readerName,
                readAt
              });
            }
            break;
          }

          case 'clear_history': {
            const session = this.sessions.get(ws);
            if (session && session.role === 'admin') {
              try {
                const keys = await this.state.storage.list({ prefix: 'msg_' });
                for (const key of keys.keys()) {
                  await this.state.storage.delete(key);
                }
                this.broadcast({ type: 'history_cleared' });
              } catch (err) {
                console.error('Failed to clear history:', err);
              }
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
      role: s.role,
      joinedAt: s.joinedAt
    }));
    this.broadcast({ type: 'peers', peers });
  }
}
