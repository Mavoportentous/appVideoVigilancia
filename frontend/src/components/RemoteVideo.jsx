import { useEffect, useRef } from 'react';
import { CameraOff, LoaderCircle, RefreshCw, Video, WifiOff } from 'lucide-react';

/** Mensaje que se muestra sobre el recuadro cuando no hay imagen. */
export function describeVideo({ cameraPresent, state, cameraOn }) {
  if (!cameraPresent) return { icon: 'idle', text: 'Aquí aparecerá el video' };
  if (state === 'failed') return { icon: 'failed', text: 'No se pudo conectar el video', retry: true };
  if (state === 'disconnected') return { icon: 'wait', text: 'Se interrumpió el video. Reconectando…' };
  if (state === 'connected') {
    return cameraOn ? null : { icon: 'off', text: 'La cámara está apagada' };
  }
  return { icon: 'wait', text: 'Conectando el video…' };
}

const ICONS = { idle: Video, off: CameraOff, failed: WifiOff, wait: LoaderCircle };

/** Recuadro 16:9 con el <video> siempre presente (el ref se mantiene estable). */
export default function RemoteVideo({ stream, cameraPresent, state, cameraOn, onRetry }) {
  const videoRef = useRef(null);
  const overlay = describeVideo({ cameraPresent, state, cameraOn });
  const Icon = overlay ? ICONS[overlay.icon] : null;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream ?? null;
    if (stream) video.play?.()?.catch?.(() => {});
  }, [stream]);

  return (
    <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-ink text-paper/80">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        disablePictureInPicture
        className={overlay ? 'hidden' : 'h-full w-full object-contain'}
      />
      {overlay && (
        <div className="flex flex-col items-center gap-3 px-4 text-center">
          <Icon
            size={40}
            className={overlay.icon === 'wait' ? 'motion-safe:animate-spin' : undefined}
            aria-hidden="true"
          />
          <p role="status">{overlay.text}</p>
          {overlay.retry && (
            <button type="button" className="btn btn-secondary !w-auto !border-paper !text-paper" onClick={onRetry}>
              <RefreshCw size={20} aria-hidden="true" />
              Reintentar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
