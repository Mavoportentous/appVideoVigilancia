import { randomInt } from 'node:crypto';

// Sin caracteres ambiguos (0/O, 1/I/L). Debe coincidir con frontend/src/utils/roomCode.js
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
export const ROLES = ['camera', 'viewer'];

/** @type {Map<string, {camera?: string, viewer?: string}>} código -> socketId por rol */
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

function isValidCode(code) {
  return code.length === CODE_LENGTH && [...code].every((c) => ALPHABET.includes(c));
}

const otherRole = (role) => (role === 'camera' ? 'viewer' : 'camera');

/**
 * Cada sala tiene como máximo 2 participantes: 1 cámara y 1 visor.
 * Si el rol ya está ocupado, el nuevo reemplaza al anterior (así un teléfono que
 * perdió la conexión puede volver a entrar sin esperar a que el servidor note la caída).
 */
export function joinRoom(code, socketId, role) {
  const key = normalizeCode(code);
  if (!isValidCode(key)) return { ok: false, error: 'invalid-code' };
  if (!ROLES.includes(role)) return { ok: false, error: 'invalid-role' };

  const room = rooms.get(key) ?? {};
  const replaced = room[role] && room[role] !== socketId ? room[role] : null;
  room[role] = socketId;
  rooms.set(key, room);

  const peerId = room[otherRole(role)];
  return {
    ok: true,
    code: key,
    role,
    replaced,
    peer: peerId ? { id: peerId, role: otherRole(role) } : null,
  };
}

/** Devuelve true solo si ese socket era realmente quien ocupaba el rol. */
export function leaveRoom(code, role, socketId) {
  const room = rooms.get(code);
  if (!room || room[role] !== socketId) return false;
  delete room[role];
  if (!room.camera && !room.viewer) rooms.delete(code); // sala vacía = se elimina
  return true;
}

export function roomCount() {
  return rooms.size;
}
