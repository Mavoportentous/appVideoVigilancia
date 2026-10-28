import { useEffect, useRef } from 'react';
import { CameraOff, LoaderCircle } from 'lucide-react';

/** Vista previa local. El <video> siempre existe para que el ref sea estable. */
export default function CameraView({ stream, status, settings }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream ?? null;
    if (stream) video.play?.()?.catch?.(() => {}); // algunos navegadores viejos lo piden
  }, [stream]);

  const caption =
    settings?.width && settings?.height
      ? `${settings.width}×${settings.height}${settings.frameRate ? ` · ${Math.round(settings.frameRate)} fps` : ''}`
      : null;

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-ink text-paper/80">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          disablePictureInPicture
          className={stream ? 'h-full w-full object-contain' : 'hidden'}
        />
        {!stream && (
          <div className="flex flex-col items-center gap-3 px-4 text-center">
            {status === 'starting' ? (
              <>
                <LoaderCircle size={40} className="motion-safe:animate-spin" aria-hidden="true" />
                <p>Encendiendo cámara…</p>
              </>
            ) : (
              <>
                <CameraOff size={40} aria-hidden="true" />
                <p>La cámara está apagada</p>
              </>
            )}
          </div>
        )}
      </div>
      {caption && <figcaption className="text-center text-sm text-ink/70">{caption}</figcaption>}
    </figure>
  );
}
