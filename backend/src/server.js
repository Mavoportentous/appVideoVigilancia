import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { generateRoomCode, joinRoom, leaveRoom, roomCount } from './rooms.js';

const PORT = process.env.PORT || 3001;
const ORIGINS = (process.env.FRONTEND_URL || 'https://localhost:5173,http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const app = express();
app.use(cors({ origin: ORIGINS }));
app.use(express.json());

// Health check (también sirve para "despertar" el servicio free de Render)
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, rooms: roomCount(), uptime: Math.round(process.uptime()) });
});

// Crea un código de sala nuevo
app.post('/api/rooms', (_req, res) => {
  res.json({ code: generateRoomCode() });
});

// Etapa 6: aquí se pedirán credenciales temporales a Cloudflare TURN.
// Por ahora solo STUN público de Google.
app.get('/api/turn-credentials', (_req, res) => {
  res.json({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
});

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: ORIGINS } });

io.on('connection', (socket) => {
  let currentRoom = null;

  socket.on('join-room', (code, ack) => {
    const result = joinRoom(code, socket.id);
    if (!result.ok) return ack?.({ ok: false, error: result.error });

    currentRoom = result.code;
    socket.join(currentRoom);
    socket.to(currentRoom).emit('user-joined', { id: socket.id });
    ack?.({ ok: true, code: currentRoom, peers: result.peers });
  });

  socket.on('disconnect', () => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('user-left', { id: socket.id });
    leaveRoom(currentRoom, socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[dog-camera] backend escuchando en http://localhost:${PORT}`);
});
