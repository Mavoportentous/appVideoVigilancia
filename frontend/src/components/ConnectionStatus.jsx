import StatusIndicator from './StatusIndicator.jsx';

const WAITING_FOR = { camera: 'la cámara', viewer: 'el visor' };
const CONNECTED = { camera: 'Cámara conectada', viewer: 'Visor conectado' };
const ROOM_ERRORS = {
  'invalid-code': 'El código no es válido.',
  'invalid-role': 'Error interno de la app. Recarga la página.',
};

export function describeConnection({ server, room, error }, peerRole) {
  if (server === 'connecting') return { status: 'connecting', label: 'Conectando con el servidor…' };
  if (server === 'waking') {
    return { status: 'connecting', label: 'Despertando el servidor… puede tardar hasta un minuto' };
  }
  if (server === 'offline') {
    return { status: 'disconnected', label: 'Sin conexión con el servidor. Reintentando…' };
  }

  switch (room) {
    case 'waiting':
      return { status: 'connecting', label: `Esperando ${WAITING_FOR[peerRole]}…` };
    case 'paired':
      return { status: 'connected', label: CONNECTED[peerRole] };
    case 'replaced':
      return { status: 'disconnected', label: 'Esta sala se abrió en otro dispositivo' };
    case 'error':
      return { status: 'disconnected', label: ROOM_ERRORS[error] ?? 'No se pudo entrar a la sala.' };
    default:
      return { status: 'connecting', label: 'Entrando a la sala…' };
  }
}

/**
 * peerRole: el rol del OTRO dispositivo ('viewer' en la cámara, 'camera' en el visor).
 * video: { text, bad } opcional; se añade al estado cuando ya están emparejados.
 */
export default function ConnectionStatus({ conn, peerRole, video }) {
  const base = describeConnection(conn, peerRole);
  const paired = base.status === 'connected' && video?.text;
  return (
    <StatusIndicator
      status={paired && video.bad ? 'disconnected' : base.status}
      label={paired ? `${base.label} · ${video.text}` : base.label}
    />
  );
}
