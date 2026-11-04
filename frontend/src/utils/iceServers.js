import { SERVER_URL, STUN_SERVERS } from './constants.js';

const CACHE_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

let cache = null; // { at, value }
let inflight = null;

async function request() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${SERVER_URL}/api/turn-credentials`, { signal: controller.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.iceServers) || data.iceServers.length === 0) throw new Error('respuesta vacía');
    return { iceServers: data.iceServers, relay: Boolean(data.relay) };
  } catch (err) {
    // Sin servidor TURN la app sigue funcionando en la misma red.
    console.warn('[ice] no se pudieron pedir credenciales, se usa solo STUN:', err);
    return { iceServers: STUN_SERVERS, relay: false };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Servidores ICE para WebRTC (STUN + TURN con credenciales temporales).
 * Devuelve { iceServers, relay }. `relay` es true si hay TURN disponible.
 * Solo se guarda en caché lo que trae TURN, para reintentar si falló.
 */
export async function getIceServers({ force = false } = {}) {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.value;

  inflight ??= request()
    .then((value) => {
      if (value.relay) cache = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Para pruebas. */
export function clearIceCache() {
  cache = null;
  inflight = null;
}
