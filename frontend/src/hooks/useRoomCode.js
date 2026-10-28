import { useCallback, useEffect, useState } from 'react';
import { generateCode, isValidCode, normalizeCode } from '../utils/roomCode.js';
import { safeGet, safeSet } from '../utils/storage.js';

const KEY = 'dogcam:room-code';

function readStored() {
  const stored = normalizeCode(safeGet(KEY));
  return isValidCode(stored) ? stored : null;
}

/**
 * Código de sala del teléfono "Cámara". Se conserva entre visitas para no
 * tener que volver a escribirlo en el visor. Se genera en el propio teléfono,
 * así no depende de que el servidor esté despierto.
 */
export function useRoomCode() {
  const [code, setCode] = useState(() => readStored() ?? generateCode());

  useEffect(() => {
    safeSet(KEY, code);
  }, [code]);

  const regenerate = useCallback(() => setCode(generateCode()), []);

  return { code, regenerate };
}
