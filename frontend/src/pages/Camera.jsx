import { RefreshCw, SwitchCamera, Video, VideoOff } from 'lucide-react';
import PageLayout from '../components/PageLayout.jsx';
import RoomCode from '../components/RoomCode.jsx';
import CameraView from '../components/CameraView.jsx';
import StatusIndicator from '../components/StatusIndicator.jsx';
import ConnectionStatus from '../components/ConnectionStatus.jsx';
import ActivityLog from '../components/ActivityLog.jsx';
import { useRoomCode } from '../hooks/useRoomCode.js';
import { useCamera } from '../hooks/useCamera.js';
import { useSocket } from '../hooks/useSocket.js';
import { useWebRTCSender } from '../hooks/useWebRTC.js';
import { FACING } from '../utils/media.js';

const STATUS = {
  off: { status: 'idle', label: 'Cámara apagada' },
  starting: { status: 'connecting', label: 'Encendiendo cámara…' },
  on: { status: 'connected', label: 'Cámara encendida' },
  error: { status: 'disconnected', label: 'Error de cámara' },
};

/** Qué decirle a la persona sobre el envío de video al visor. */
function describeSending(state, cameraOn) {
  switch (state) {
    case 'connected':
      return { text: cameraOn ? 'enviando video' : 'sin imagen (cámara apagada)' };
    case 'failed':
      return { text: 'no se pudo conectar el video', bad: true };
    case 'disconnected':
      return { text: 'video interrumpido', bad: true };
    case 'negotiating':
      return { text: 'conectando el video…' };
    default:
      return null;
  }
}

export default function Camera() {
  const { code, regenerate } = useRoomCode();
  const conn = useSocket({ code, role: 'camera' });
  const { stream, status, error, facing, settings, toggle, switchCamera } = useCamera();
  const viewerId = conn.room === 'paired' && conn.peer?.role === 'viewer' ? conn.peer.id : null;
  const sender = useWebRTCSender({ socket: conn.socket, viewerId, stream });
  const video = describeSending(sender.state, status === 'on');
  const indicator = STATUS[status];
  const isActive = status === 'on' || status === 'starting';

  return (
    <PageLayout title="Cámara">
      <p>En el otro dispositivo toca «Ver cámara» y escribe este código.</p>

      <RoomCode code={code} />

      <ConnectionStatus conn={conn} peerRole="viewer" video={video} />

      <StatusIndicator status={indicator.status} label={indicator.label} />
      <CameraView stream={stream} status={status} settings={settings} />

      {error && (
        <p role="alert" className="rounded-2xl border-4 border-signal px-4 py-3 font-bold text-signal">
          {error.message}
        </p>
      )}

      <button
        type="button"
        className={isActive ? 'btn btn-danger' : 'btn btn-primary'}
        onClick={toggle}
      >
        {isActive ? <VideoOff size={24} aria-hidden="true" /> : <Video size={24} aria-hidden="true" />}
        {isActive ? 'Apagar cámara' : status === 'error' ? 'Reintentar' : 'Encender cámara'}
      </button>

      <button type="button" className="btn btn-secondary" onClick={switchCamera} disabled={status === 'starting'}>
        <SwitchCamera size={24} aria-hidden="true" />
        {facing === FACING.BACK ? 'Usar cámara frontal' : 'Usar cámara trasera'}
      </button>

      <button type="button" className="btn btn-secondary" onClick={regenerate}>
        <RefreshCw size={22} aria-hidden="true" />
        Generar código nuevo
      </button>

      <ActivityLog events={conn.events} />
    </PageLayout>
  );
}
