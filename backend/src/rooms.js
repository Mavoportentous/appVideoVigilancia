import { randomInt } from 'node:crypto';

// Sin caracteres ambiguos (0/O, 1/I/L)
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
export const MAX_PEERS = 2; // 1 cámara + 1 visor

/** @type {Map<string, Set<string>>} roomCode -> socketIds */
const rooms = new Map();

export function generateRoomCode() {
  let code;
  do {
    code = Array.from({ length: CODE_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  } while (rooms.has(code));
  return code;
}

export function normalizeCode(code) {
  return String(code ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function joinRoom(code, socketId) {
  const key = normalizeCode(code);
  if (key.length !== CODE_LENGTH) return { ok: false, error: 'invalid-code' };

  const peers = rooms.get(key) ?? new Set();
  if (!peers.has(socketId) && peers.size >= MAX_PEERS) return { ok: false, error: 'room-full' };

  peers.add(socketId);
  rooms.set(key, peers);
  return { ok: true, code: key, peers: [...peers].filter((id) => id !== socketId) };
}

export function leaveRoom(code, socketId) {
  const peers = rooms.get(code);
  if (!peers) return;
  peers.delete(socketId);
  if (peers.size === 0) rooms.delete(code); // sala vacía = se elimina
}

export function roomCount() {
  return rooms.size;
}
