import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { formatCode } from '../utils/roomCode.js';
import { copyText } from '../utils/clipboard.js';

/** Muestra el código de sala en grande y permite copiarlo. */
export default function RoomCode({ code }) {
  const [copy, setCopy] = useState('idle'); // idle | copied | failed

  useEffect(() => {
    if (copy === 'idle') return undefined;
    const t = setTimeout(() => setCopy('idle'), 2500);
    return () => clearTimeout(t);
  }, [copy]);

  async function handleCopy() {
    setCopy((await copyText(formatCode(code))) ? 'copied' : 'failed');
  }

  return (
    <section className="flex flex-col gap-3" aria-label="Código de sala">
      <p className="select-all rounded-2xl border-4 border-ink/15 bg-white px-4 py-6 text-center text-4xl font-bold tracking-[0.12em]">
        {formatCode(code)}
      </p>
      <button type="button" className="btn btn-primary" onClick={handleCopy}>
        {copy === 'copied' ? <Check size={24} aria-hidden="true" /> : <Copy size={24} aria-hidden="true" />}
        {copy === 'copied' ? 'Código copiado' : 'Copiar código'}
      </button>
      <p role="status" className="min-h-6 text-center font-bold text-signal">
        {copy === 'failed' ? 'No se pudo copiar. Mantén presionado el código para copiarlo.' : ''}
      </p>
    </section>
  );
}
