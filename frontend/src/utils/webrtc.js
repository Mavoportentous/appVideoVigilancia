import { MAX_VIDEO_BITRATE, STUN_SERVERS } from './constants.js';
import { getIceServers } from './iceServers.js';

const RELAY_KEY = 'dogcam:force-relay';

/**
 * Modo de prueba: con `?relay=1` en la dirección, WebRTC usa SOLO el relay TURN.
 * Sirve para comprobar que TURN funciona sin salir de la misma red WiFi.
 * Se recuerda durante la sesión; `?relay=0` lo desactiva.
 */
export function isRelayForced() {
  try {
    const q = new URLSearchParams(window.location.search).get('relay');
    if (q === '1' || q === '0') window.sessionStorage.setItem(RELAY_KEY, q);
    return window.sessionStorage.getItem(RELAY_KEY) === '1';
  } catch {
    return false;
  }
}

export function createPeerConnection(iceServers = STUN_SERVERS) {
  return new RTCPeerConnection({
    iceServers,
    iceTransportPolicy: isRelayForced() ? 'relay' : 'all',
  });
}

/** Identifica una sesión de conexión: los mensajes de sesiones viejas se ignoran. */
export function newSessionId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function sendSignal(socket, message) {
  socket.emit('signal', message);
}

/**
 * Estado simplificado de la conexión: idle | negotiating | connected | disconnected | failed.
 * Los Android viejos no tienen connectionState; se usa iceConnectionState.
 */
export function describePeerState(pc) {
  const state = pc.connectionState ?? pc.iceConnectionState;
  switch (state) {
    case 'connected':
    case 'completed':
      return 'connected';
    case 'disconnected':
      return 'disconnected';
    case 'failed':
      return 'failed';
    case 'closed':
      return 'idle';
    default:
      return 'negotiating'; // new, connecting, checking
  }
}

/** Limita el bitrate del video enviado. Si el navegador no lo permite, se ignora. */
export async function limitBitrate(sender, maxBitrate = MAX_VIDEO_BITRATE) {
  try {
    const params = sender.getParameters();
    if (!params.encodings?.length) params.encodings = [{}];
    params.encodings[0].maxBitrate = maxBitrate;
    await sender.setParameters(params);
  } catch (err) {
    console.warn('[webrtc] no se pudo limitar el bitrate', err);
  }
}

/** Tipo de un candidato ICE ('host' | 'srflx' | 'prflx' | 'relay'). */
export function candidateType(candidate) {
  return candidate?.type ?? /typ (\w+)/.exec(candidate?.candidate ?? '')?.[1] ?? 'desconocido';
}

/**
 * Detalle de la ruta elegida: { route, local, remote } o null si todavía no hay par elegido.
 * route: 'relay' (a través de TURN) o 'direct' (directa o por STUN).
 * local/remote: tipo de candidato de cada extremo (host, srflx, prflx, relay).
 */
export async function getRouteInfo(pc) {
  const stats = await pc.getStats();
  let pair = null;
  stats.forEach((r) => {
    if (r.type === 'transport' && r.selectedCandidatePairId) pair = stats.get(r.selectedCandidatePairId);
  });
  if (!pair) {
    stats.forEach((r) => {
      if (r.type === 'candidate-pair' && (r.selected || (r.nominated && r.state === 'succeeded'))) pair = r;
    });
  }
  if (!pair) return null;

  const local = stats.get(pair.localCandidateId)?.candidateType ?? null;
  const remote = stats.get(pair.remoteCandidateId)?.candidateType ?? null;
  return { route: local === 'relay' || remote === 'relay' ? 'relay' : 'direct', local, remote };
}

/** Solo el tipo de ruta: 'relay' | 'direct' | null. */
export async function getRouteType(pc) {
  return (await getRouteInfo(pc))?.route ?? null;
}

/**
 * Las credenciales TURN caducan (24 h). En sesiones largas se renuevan sin cortar
 * la conexión, con setConfiguration.
 */
export async function refreshIceServers(pc) {
  try {
    const { iceServers, relay } = await getIceServers({ force: true });
    if (!relay) return;
    pc.setConfiguration({ ...pc.getConfiguration(), iceServers });
  } catch (err) {
    console.warn('[webrtc] no se pudieron renovar las credenciales TURN', err);
  }
}
