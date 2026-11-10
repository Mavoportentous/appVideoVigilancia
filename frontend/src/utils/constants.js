// En desarrollo queda vacío (mismo origen, vía proxy de Vite).
// En producción: VITE_SERVER_URL = URL del backend en Render.
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

export const STUN_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

// Límites de video pensados para teléfonos viejos (menos resolución = menos carga).
export const VIDEO_LIMITS = {
  width: { ideal: 1280, max: 1280 },
  height: { ideal: 720, max: 720 },
  frameRate: { ideal: 24, max: 30 },
};

// Tope de bitrate del video enviado: cuida la subida de teléfonos viejos y la cuota de TURN.
export const MAX_VIDEO_BITRATE = 1_200_000; // bits por segundo

// Se muestra en el panel de diagnóstico: sirve para saber qué versión del código está cargada.
export const APP_BUILD = 'etapa-6b';
