import PageLayout from './PageLayout.jsx';
import ConnectionStatus from './ConnectionStatus.jsx';
import ActivityLog from './ActivityLog.jsx';
import RemoteVideo from './RemoteVideo.jsx';
import { useSocket } from '../hooks/useSocket.js';
import { useWebRTCReceiver } from '../hooks/useWebRTC.js';
import { formatCode } from '../utils/roomCode.js';

export default function ViewerView({ code }) {
  const conn = useSocket({ code, role: 'viewer' });
  const cameraId = conn.room === 'paired' && conn.peer?.role === 'camera' ? conn.peer.id : null;
  const video = useWebRTCReceiver({ socket: conn.socket, cameraId });

  return (
    <PageLayout title="Visor" backTo="/viewer" backLabel="Cambiar código">
      <p>
        Sala <strong>{formatCode(code)}</strong>
      </p>
      <ConnectionStatus conn={conn} peerRole="camera" />
      <RemoteVideo
        stream={video.remoteStream}
        cameraPresent={Boolean(cameraId)}
        state={video.state}
        cameraOn={video.cameraOn}
        onRetry={video.retry}
      />
      <ActivityLog events={conn.events} />
    </PageLayout>
  );
}
