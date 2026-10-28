// En desarrollo queda vacío (mismo origen, vía proxy de Vite).
// En producción: VITE_SERVER_URL = URL del backend en Render.
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

export const STUN_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

export const VIDEO_CONSTRAINTS = {
  video: {
    width: { ideal: 1280, max: 1280 },
    height: { ideal: 720, max: 720 },
    frameRate: { ideal: 24, max: 30 },
    facingMode: 'environment',
  },
  audio: false,
};

export const FALLBACK_CONSTRAINTS = { video: true, audio: false };
