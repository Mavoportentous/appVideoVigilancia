import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Eye } from 'lucide-react';
import PageLayout from '../components/PageLayout.jsx';
import RoomCodeInput from '../components/RoomCodeInput.jsx';
import ViewerView from '../components/ViewerView.jsx';
import { CODE_LENGTH, isValidCode, normalizeCode } from '../utils/roomCode.js';
import { safeGet, safeSet } from '../utils/storage.js';

const KEY = 'dogcam:viewer-code';

function CodeEntry() {
  const navigate = useNavigate();
  const [value, setValue] = useState(() => normalizeCode(safeGet(KEY)));
  const [error, setError] = useState('');

  function handleChange(next) {
    setValue(next);
    setError('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    const code = normalizeCode(value);
    if (code.length < CODE_LENGTH) {
      setError(`El código tiene ${CODE_LENGTH} caracteres. Faltan ${CODE_LENGTH - code.length}.`);
      return;
    }
    if (!isValidCode(code)) {
      setError('El código solo usa letras (sin I, L ni O) y números del 2 al 9. Revisa cómo lo escribiste.');
      return;
    }
    safeSet(KEY, code);
    navigate(`/viewer/${code}`);
  }

  return (
    <PageLayout title="Ver cámara">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <RoomCodeInput value={value} onChange={handleChange} error={error} />
        <button type="submit" className="btn btn-primary">
          <Eye size={24} aria-hidden="true" />
          Ver cámara
        </button>
      </form>
    </PageLayout>
  );
}

export default function Viewer() {
  const { code: param } = useParams();
  if (param === undefined) return <CodeEntry />;

  const code = normalizeCode(param);
  if (!isValidCode(code)) return <Navigate to="/viewer" replace />;
  return <ViewerView code={code} />;
}
