import { VIDEO_LIMITS } from './constants.js';

export const FACING = { BACK: 'environment', FRONT: 'user' };

export function cameraSupported() {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
}

// Errores que significan "esta combinación de restricciones no sirve": se prueba la siguiente.
const CONSTRAINT_ERRORS = ['OverconstrainedError', 'ConstraintNotSatisfiedError', 'TypeError'];

/**
 * Abre la cámara pidiendo primero 720p/24fps y relajando las restricciones si el
 * teléfono no las soporta. `ideal` en facingMode evita fallar cuando solo hay una cámara.
 */
export async function openCameraStream(facing) {
  const attempts = [
    { video: { ...VIDEO_LIMITS, facingMode: { ideal: facing } }, audio: false },
    { video: { facingMode: { ideal: facing } }, audio: false },
    { video: true, audio: false },
  ];

  let lastError;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastError = err;
      if (!CONSTRAINT_ERRORS.includes(err?.name)) throw err; // permiso, cámara ocupada, etc.
    }
  }
  throw lastError;
}

/** Traduce un error de la cámara a un mensaje claro para el usuario. */
export function describeCameraError(err) {
  const name = err?.name ?? 'UnknownError';
  switch (name) {
    case 'UnsupportedError':
      return {
        name,
        message: 'Este navegador no permite usar la cámara aquí. Abre la app con una dirección que empiece con https://.',
      };
    case 'NotAllowedError':
    case 'SecurityError':
    case 'PermissionDeniedError':
      return {
        name,
        message: 'No se dio permiso para usar la cámara. Permítela en los ajustes del navegador y vuelve a intentar.',
      };
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return { name, message: 'No se encontró ninguna cámara en este dispositivo.' };
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return {
        name,
        message: 'La cámara está ocupada por otra aplicación. Ciérrala e intenta de nuevo.',
      };
    case 'CameraEndedError':
      return { name, message: 'La cámara se detuvo. Puede que otra aplicación la esté usando.' };
    default:
      return { name, message: 'No se pudo encender la cámara. Intenta de nuevo.' };
  }
}

function unsupportedError() {
  const err = new Error('getUserMedia no disponible');
  err.name = 'UnsupportedError';
  return err;
}

export function assertCameraSupported() {
  if (!cameraSupported()) throw unsupportedError();
}
