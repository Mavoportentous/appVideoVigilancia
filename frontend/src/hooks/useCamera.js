import { useCallback, useEffect, useRef, useState } from 'react';
import { FACING, assertCameraSupported, describeCameraError, openCameraStream } from '../utils/media.js';
import { safeGet, safeSet } from '../utils/storage.js';

const FACING_KEY = 'dogcam:facing';

function readFacing() {
  return safeGet(FACING_KEY) === FACING.FRONT ? FACING.FRONT : FACING.BACK;
}

function stopStream(stream) {
  stream?.getTracks().forEach((t) => t.stop());
}

/**
 * Cámara local del teléfono.
 * status: off | starting | on | error
 */
export function useCamera() {
  const [stream, setStream] = useState(null);
  const [status, setStatus] = useState('off');
  const [error, setError] = useState(null);
  const [facing, setFacing] = useState(readFacing);
  const [settings, setSettings] = useState(null);

  const streamRef = useRef(null);
  const requestRef = useRef(0); // invalida arranques que quedaron a medias

  const release = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
    setStream(null);
    setSettings(null);
  }, []);

  const stop = useCallback(() => {
    requestRef.current += 1;
    release();
    setError(null);
    setStatus('off');
  }, [release]);

  const start = useCallback(
    async (nextFacing) => {
      const wanted = nextFacing ?? facing;
      const requestId = (requestRef.current += 1);

      // Solo una cámara a la vez: se libera la anterior antes de pedir la nueva
      // (los teléfonos viejos fallan si se abren dos a la vez).
      release();
      setError(null);
      setStatus('starting');

      try {
        assertCameraSupported();
        const next = await openCameraStream(wanted);

        if (requestId !== requestRef.current) {
          stopStream(next); // el usuario apagó o cambió mientras esperaba el permiso
          return;
        }

        const [track] = next.getVideoTracks();
        track?.addEventListener('ended', () => {
          if (streamRef.current !== next) return;
          release();
          setError(describeCameraError({ name: 'CameraEndedError' }));
          setStatus('error');
        });

        streamRef.current = next;
        setStream(next);
        setSettings(track?.getSettings?.() ?? null);
        setStatus('on');
      } catch (err) {
        if (requestId !== requestRef.current) return;
        console.warn('[camera]', err);
        setError(describeCameraError(err));
        setStatus('error');
      }
    },
    [facing, release]
  );

  const toggle = useCallback(() => {
    if (status === 'on' || status === 'starting') stop();
    else start();
  }, [status, start, stop]);

  const switchCamera = useCallback(() => {
    const next = facing === FACING.BACK ? FACING.FRONT : FACING.BACK;
    setFacing(next);
    safeSet(FACING_KEY, next);
    // Si la cámara está encendida, se reinicia con la otra; si no, queda lista para la próxima vez.
    if (status === 'on' || status === 'starting') start(next);
  }, [facing, status, start]);

  // Al salir de la página, la cámara se apaga siempre.
  useEffect(
    () => () => {
      requestRef.current += 1;
      stopStream(streamRef.current);
      streamRef.current = null;
    },
    []
  );

  return { stream, status, error, facing, settings, toggle, switchCamera };
}
