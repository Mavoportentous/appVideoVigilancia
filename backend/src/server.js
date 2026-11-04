import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { generateRoomCode, joinRoom, leaveRoom, roomCount } from './rooms.js';
import { getIceServers, turnConfigured } from './turn.js';

const PORT = process.env.PORT || 3001;
const ORIGINS = (process.env.FRONTEND_URL || 'https://localhost:5173,http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const app = express();
app.set('trust proxy', 1); // detrás del proxy de Render, para ver la IP real del cliente
app.use(cors({ origin: ORIGINS }));
app.use(express.json());

// Health check (también sirve para "despertar" el servicio free de Render)
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, rooms: roomCount(), uptime: Math.round(process.uptime()) });
});

// Crea un código de sala nuevo (disponible; el frontend actual genera el suyo)
app.post('/api/rooms', (_req, res) => {
  res.json({ code: generateRoomCode() });
});

// Límite simple por IP (en memoria) para que nadie gaste la cuota de TURN pidiendo credenciales.
function rateLimit({ windowMs, max }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [ip, h] of hits) if (h.resetAt < now) hits.delete(ip);
  }, windowMs).unref();

  return (req, res, next) => {
    const now = Date.now();
    let h = hits.get(req.ip);
    if (!h || h.resetAt < now) {
      h = { count: 0, resetAt: now + windowMs };
      hits.set(req.ip, h);
    }
    h.count += 1;
    if (h.count > max) {
      res.set('Retry-After', String(Math.ceil((h.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'too-many-requests' });
    }
    return next();
  };
}

// Servidores ICE para WebRTC: TURN de Cloudflare si está configurado; si no, solo STUN.
// `relay` indica si hay TURN disponible.
app.get('/api/turn-credentials', rateLimit({ windowMs: 10 * 60 * 1000, max: 60 }), async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await getIceServers());
});

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: ORIGINS } });

// Mensajes de WebRTC que el servidor solo reenvía al otro dispositivo de la sala.
//   ready        el visor pide que la cámara inicie una sesión
//   offer/answer descripciones SDP
//   candidate    candidatos ICE
//   camera-state la cámara avisa si está enviando imagen o no
const SIGNAL_TYPES = new Set(['ready', 'offer', 'answer', 'candidate', 'camera-state']);
const MAX_SIGNAL_BYTES = 20_000; // un SDP típico pesa menos de 10 KB

const log = (...args) => console.log(new Date().toLocaleTimeString('es-MX'), ...args);

io.on('connection', (socket) => {
  /** @type {{code: string, role: string} | null} */
  let current = null;

  function leaveCurrent() {
    if (!current) return;
    const { code, role } = current;
    current = null;
    socket.leave(code);
    // Solo avisa si este socket seguía ocupando el rol (no si ya lo reemplazaron)
    if (leaveRoom(code, role, socket.id)) {
      socket.to(code).emit('user-left', { id: socket.id, role });
      log(`[${code}] salió ${role}`);
    }
  }

  socket.on('join-room', (payload, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    const { code, role } = payload ?? {};

    leaveCurrent(); // un socket está en una sola sala a la vez

    const result = joinRoom(code, socket.id, role);
    if (!result.ok) return reply({ ok: false, error: result.error });

    if (result.replaced) {
      const old = io.sockets.sockets.get(result.replaced);
      old?.leave(result.code);
      old?.emit('replaced', { code: result.code });
      log(`[${result.code}] ${role} reemplazado por una conexión nueva`);
    }

    current = { code: result.code, role: result.role };
    socket.join(result.code);
    socket.to(result.code).emit('user-joined', { id: socket.id, role: result.role });
    log(`[${result.code}] entró ${result.role}`);

    reply({ ok: true, code: result.code, role: result.role, peer: result.peer });
  });

  socket.on('signal', (msg) => {
    if (!current) return; // solo quien está en una sala puede señalizar
    if (!msg || typeof msg !== 'object' || !SIGNAL_TYPES.has(msg.type)) return;
    if (JSON.stringify(msg).length > MAX_SIGNAL_BYTES) return;
    // La sala tiene como máximo 2 participantes: esto llega solo al otro.
    socket.to(current.code).emit('signal', msg);
  });

  socket.on('disconnect', leaveCurrent);
});

httpServer.listen(PORT, () => {
  console.log(`[dog-camera] backend escuchando en http://localhost:${PORT}`);
  console.log(
    turnConfigured()
      ? '[dog-camera] TURN de Cloudflare: configurado'
      : '[dog-camera] TURN de Cloudflare: NO configurado (solo STUN; funciona en la misma red)'
  );
});
