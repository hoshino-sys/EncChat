import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = process.env.PORT || 8787;

const server = http.createServer((req, res) => {
  // Simple health check and CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/health' || req.url === '/') {
    const totalClients = wss.clients.size;
    const roomCount = rooms.size;
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      service: 'EncChat Local Relay Server',
      totalClients,
      roomCount,
      timestamp: Date.now()
    }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

const wss = new WebSocketServer({ server });

// Map<roomId, Set<{ ws: WebSocket, userId: string, userName: string, joinedAt: number }>>
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
          const { roomId, userId, userName } = data;
          if (!roomId || !userId) return;

          const room = getOrCreateRoom(roomId);

          // Remove any previous connection for this same user in the room
          for (const existing of room) {
            if (existing.userId === userId) {
              room.delete(existing);
            }
          }

          clientInfo = {
            ws,
            roomId,
            userId,
            userName: userName || `用户-${userId.slice(0, 4)}`,
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
          break;
        }

        case 'message': {
          if (!clientInfo || !clientInfo.roomId) return;
          // Forward encrypted message to other clients in the room
          broadcastToRoom(clientInfo.roomId, {
            type: 'message',
            message: data.message
          }, ws);
          break;
        }

        case 'name_change': {
          if (!clientInfo || !clientInfo.roomId) return;
          const oldName = clientInfo.userName;
          clientInfo.userName = data.newName;
          broadcastToRoom(clientInfo.roomId, {
            type: 'name_change',
            userId: clientInfo.userId,
            oldName,
            newName: data.newName,
          });
          broadcastPeerList(clientInfo.roomId);
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
