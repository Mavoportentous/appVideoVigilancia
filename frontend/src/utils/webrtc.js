import { MAX_VIDEO_BITRATE, STUN_SERVERS } from './constants.js';

/** Etapa 6: aquí se sumarán los servidores TURN de Cloudflare. */
export function createPeerConnection(iceServers = STUN_SERVERS) {
  return new RTCPeerConnection({ iceServers });
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
