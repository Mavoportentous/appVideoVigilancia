import { CameraOff, RefreshCw } from 'lucide-react';
import PageLayout from '../components/PageLayout.jsx';
import RoomCode from '../components/RoomCode.jsx';
import StatusIndicator from '../components/StatusIndicator.jsx';
import { useRoomCode } from '../hooks/useRoomCode.js';

// Etapa 3: aquí se encenderá la cámara y se mostrará la vista local.
export default function Camera() {
  const { code, regenerate } = useRoomCode();

  return (
    <PageLayout title="Cámara">
      <p>En el otro dispositivo toca «Ver cámara» y escribe este código.</p>

      <RoomCode code={code} />

      <StatusIndicator status="idle" label="Cámara apagada" />
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border-4 border-dashed border-ink/20 text-ink/60">
        <CameraOff size={40} aria-hidden="true" />
        <p>Aquí se verá la imagen de la cámara</p>
      </div>

      <button type="button" className="btn btn-secondary" onClick={regenerate}>
        <RefreshCw size={22} aria-hidden="true" />
        Generar código nuevo
      </button>
    </PageLayout>
  );
}
