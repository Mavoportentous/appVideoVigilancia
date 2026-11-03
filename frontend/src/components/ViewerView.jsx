import { Video } from 'lucide-react';
import PageLayout from './PageLayout.jsx';
import ConnectionStatus from './ConnectionStatus.jsx';
import ActivityLog from './ActivityLog.jsx';
import { useSocket } from '../hooks/useSocket.js';
import { formatCode } from '../utils/roomCode.js';

// Etapa 5: aquí se conectará el <video> con el stream recibido por WebRTC.
export default function ViewerView({ code }) {
  const conn = useSocket({ code, role: 'viewer' });

  return (
    <PageLayout title="Visor" backTo="/viewer" backLabel="Cambiar código">
      <p>
        Sala <strong>{formatCode(code)}</strong>
      </p>
      <ConnectionStatus conn={conn} peerRole="camera" />
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl bg-ink text-paper/80">
        <Video size={40} aria-hidden="true" />
        <p>Aquí aparecerá el video</p>
      </div>
      <ActivityLog events={conn.events} />
    </PageLayout>
  );
}
