const { WebSocketServer } = require('ws');
const port = process.env.PORT || 8080;
const wss = new WebSocketServer({ port });
const rooms = new Map();

function broadcastPeers(room) {
  const set = rooms.get(room);
  if (!set) return;
  const m = JSON.stringify({ type: 'peers', count: set.size });
  set.forEach((c) => c.readyState === 1 && c.send(m));
}

function leave(ws) {
  if (!ws.room) return;
  const set = rooms.get(ws.room);
  const room = ws.room;
  ws.room = null;
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) rooms.delete(room);
  else broadcastPeers(room);
}

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (m.type === 'ping') return ws.send('{"type":"pong"}');
    if (m.type === 'join') {
      leave(ws);
      const room = String(m.room || '').slice(0, 64);
      if (!room) return;
      ws.room = room;
      if (!rooms.has(room)) rooms.set(room, new Set());
      rooms.get(room).add(ws);
      return broadcastPeers(room);
    }
    if (!ws.room || (m.type !== 'event' && m.type !== 'hello')) return;
    rooms.get(ws.room).forEach((c) => {
      if (c !== ws && c.readyState === 1) c.send(JSON.stringify(m));
    });
  });
  ws.on('close', () => leave(ws));
});

console.log(`SyncWatch sunucusu ws://localhost:${port} üzerinde çalışıyor`);
