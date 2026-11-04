// Credenciales TURN de Cloudflare Realtime.
// Docs: https://developers.cloudflare.com/realtime/turn/generate-credentials/
// El token de Cloudflare vive SOLO aquí (variables de entorno), nunca en el frontend.

const API_BASE = process.env.CLOUDFLARE_TURN_API_BASE || 'https://rtc.live.cloudflare.com';
const TTL_SECONDS = Number(process.env.TURN_TTL_SECONDS) || 86_400; // 24 h
const CACHE_MS = 60 * 60 * 1000; // se reutilizan 1 h: menos llamadas a Cloudflare
const FAILURE_BACKOFF_MS = 60 * 1000; // tras un error no se insiste durante 1 min
const REQUEST_TIMEOUT_MS = 8_000;

const STUN_ONLY = Object.freeze({
  iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
  relay: false,
});

let cache = null; // { at, value }
let failedAt = 0;
let inflight = null; // evita varias llamadas simultáneas

export function turnConfigured() {
  return Boolean(process.env.CLOUDFLARE_TURN_KEY_ID && process.env.CLOUDFLARE_TURN_API_TOKEN);
}

/**
 * Cloudflare devuelve `iceServers` como lista (formato actual) o como objeto (formato
 * anterior). Se normaliza a lista y se quita el puerto 53, que los navegadores bloquean.
 */
export function normalizeIceServers(iceServers) {
  const list = Array.isArray(iceServers) ? iceServers : [iceServers].filter(Boolean);
  return list
    .map((server) => ({
      ...server,
      urls: (Array.isArray(server.urls) ? server.urls : [server.urls])
        .filter(Boolean)
        .filter((url) => !/:53(\?|$)/.test(url)),
    }))
    .filter((server) => server.urls.length > 0);
}

async function requestFromCloudflare() {
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
  const token = process.env.CLOUDFLARE_TURN_API_TOKEN;

  const res = await fetch(
    `${API_BASE}/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: TTL_SECONDS }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }
  );
  if (!res.ok) throw new Error(`Cloudflare respondió ${res.status}`);

  const data = await res.json();
  const iceServers = normalizeIceServers(data.iceServers);
  if (!iceServers.some((s) => s.username && s.credential)) {
    throw new Error('La respuesta de Cloudflare no trae credenciales TURN');
  }
  return iceServers;
}

/** Siempre devuelve algo utilizable: TURN si se puede, STUN si no. */
export async function getIceServers() {
  if (!turnConfigured()) return STUN_ONLY;
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  if (failedAt && Date.now() - failedAt < FAILURE_BACKOFF_MS) return STUN_ONLY;

  inflight ??= requestFromCloudflare()
    .then((iceServers) => {
      cache = { at: Date.now(), value: { iceServers, relay: true } };
      failedAt = 0;
      return cache.value;
    })
    .catch((err) => {
      failedAt = Date.now();
      console.error('[turn] no se pudieron obtener credenciales:', err.message);
      return STUN_ONLY;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
