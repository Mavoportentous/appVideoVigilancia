import { Video } from 'lucide-react';
import PageLayout from './PageLayout.jsx';
import StatusIndicator from './StatusIndicator.jsx';
import { formatCode } from '../utils/roomCode.js';

// Etapa 5: aquí se conectará el <video> con el stream recibido por WebRTC.
export default function ViewerView({ code }) {
  return (
    <PageLayout title="Visor" backTo="/viewer" backLabel="Cambiar código">
      <p>
        Sala <strong>{formatCode(code)}</strong>
      </p>
      <StatusIndicator status="connecting" label="Esperando la cámara" />
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl bg-ink text-paper/80">
        <Video size={40} aria-hidden="true" />
        <p>Aquí aparecerá el video</p>
      </div>
    </PageLayout>
  );
}
