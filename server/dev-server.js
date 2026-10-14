import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = process.env.PORT || 8787;
const ALLOWED_USERS = ['夜星', '小夜星'];

// In-memory credential storage for dev server
const userPasswords = new Map(); // username -> passwordHash

const server = http.createServer(async (req, res) => {
  // Simple health check and CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (parsedUrl.pathname === '/health' || parsedUrl.pathname === '/') {
    const totalClients = wss.clients.size;
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      service: 'EncChat Local Relay Server',
      totalClients,
      timestamp: Date.now()
    }));
    return;
  }

  // API: Account status
  if (parsedUrl.pathname === '/api/account-status') {
    const username = parsedUrl.searchParams.get('username');
    if (!username || !ALLOWED_USERS.includes(username)) {
      res.writeHead(400);
      res.end(JSON.stringify({ valid: false, error: '非预设席位' }));
      return;
    }

    const hasPassword = userPasswords.has(username);
    const role = username === '夜星' ? 'admin' : 'user';

    res.writeHead(200);
    res.end(JSON.stringify({
      valid: true,
      username,
      role,
      hasPassword
    }));
    return;
  }

  // API: Auth
  if (parsedUrl.pathname === '/api/auth' && req.method === 'POST') {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', () => {
      try {
        const body = JSON.parse(bodyStr);
        const { username, passwordHash, isFirstTime } = body;

        if (!username || !ALLOWED_USERS.includes(username) || !passwordHash) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: '席位或密印格式有误' }));
          return;
        }

        const role = username === '夜星' ? 'admin' : 'user';
        const existingPwd = userPasswords.get(username);

        if (isFirstTime) {
          if (existingPwd) {
            res.writeHead(403);
            res.end(JSON.stringify({ success: false, error: '该席位密印已固化，不可重复设定' }));
            return;
          }

          userPasswords.set(username, passwordHash);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, username, role, isFirstTimeSet: true }));
          return;
        } else {
          if (!existingPwd) {
            res.writeHead(400);
            res.end(JSON.stringify({ success: false, needSetup: true, error: '该席位初次使用，请设定密印' }));
            return;
          }

          if (existingPwd !== passwordHash) {
            res.writeHead(401);
            res.end(JSON.stringify({ success: false, error: '密印有误，无法入席' }));
            return;
          }

          res.writeHead(200);
          res.end(JSON.stringify({ success: true, username, role }));
          return;
        }
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: '无效请求' }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

const wss = new WebSocketServer({ server });

// Map<roomId, Set<{ ws: WebSocket, userId: string, userName: string, role: string, joinedAt: number }>>
const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  return rooms.get(roomId);
}

function broadcastToRoom(roomId, messageObj, excludeWs = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  const payload = JSON.stringify(messageObj);
  for (const client of room) {
    if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

function broadcastPeerList(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  const peers = Array.from(room).map(c => ({
    id: c.userId,
    name: c.userName,
    role: c.role,
    joinedAt: c.joinedAt
  }));
  broadcastToRoom(roomId, { type: 'peers', peers });
}

wss.on('connection', (ws, req) => {
  let clientInfo = null;

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      if (!data || !data.type) return;

      switch (data.type) {
        case 'join': {
          const { roomId, userId, userName, authHash } = data;
          if (!roomId || !userId) return;

          if (!ALLOWED_USERS.includes(userName)) {
            ws.send(JSON.stringify({ type: 'auth_error', error: '非预设席位' }));
            ws.close();
            return;
          }

          const storedPwd = userPasswords.get(userName);
          if (storedPwd && authHash && authHash !== storedPwd) {
            ws.send(JSON.stringify({ type: 'auth_error', error: '密印校验失败' }));
            ws.close();
            return;
          }

          const role = userName === '夜星' ? 'admin' : 'user';
          const room = getOrCreateRoom(roomId);

          // Remove any previous connection for this same user in the room
          for (const existing of room) {
            if (existing.userName === userName) {
              room.delete(existing);
            }
          }

          clientInfo = {
            ws,
            roomId,
            userId,
            userName,
            role,
            joinedAt: Date.now(),
          };

          room.add(clientInfo);

          // Broadcast peer update and notification
          broadcastPeerList(roomId);
          broadcastToRoom(roomId, {
            type: 'join_notice',
            userId: clientInfo.userId,
            userName: clientInfo.userName
          }, ws);

          // Send history
          ws.send(JSON.stringify({
            type: 'history',
            messages: messageStorage
          }));
          break;
        }

        case 'message': {
          if (!clientInfo || !clientInfo.roomId) return;
          const msg = data.message;
          if (msg && msg.id) {
            messageStorage.push(msg);
            // Forward message to other clients in the room
            broadcastToRoom(clientInfo.roomId, {
              type: 'message',
              message: msg
            }, ws);
          }
          break;
        }

        case 'ping': {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
          break;
        }

        case 'leave': {
          cleanupClient();
          break;
        }
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  function cleanupClient() {
    if (clientInfo && clientInfo.roomId) {
      const room = rooms.get(clientInfo.roomId);
      if (room) {
        room.delete(clientInfo);
        broadcastToRoom(clientInfo.roomId, {
          type: 'leave_notice',
          userId: clientInfo.userId,
          userName: clientInfo.userName
        });
        broadcastPeerList(clientInfo.roomId);
        if (room.size === 0) {
          rooms.delete(clientInfo.roomId);
        }
      }
      clientInfo = null;
    }
  }

  ws.on('close', () => {
    cleanupClient();
  });

  ws.on('error', (err) => {
    console.warn('Client WebSocket error:', err.message);
    cleanupClient();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[EncChat Relay] Server is listening on ws://0.0.0.0:${PORT}`);
  console.log(`[EncChat Relay] Health check available at http://localhost:${PORT}/health`);
});
