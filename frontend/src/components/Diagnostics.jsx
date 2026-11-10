import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { APP_BUILD } from '../utils/constants.js';
import { isRelayForced } from '../utils/webrtc.js';
import { copyText } from '../utils/clipboard.js';

const STATE_LABEL = {
  idle: 'sin conexión de video',
  negotiating: 'negociando',
  connected: 'conectado',
  disconnected: 'interrumpido',
  failed: 'falló',
};
const ROUTE_LABEL = { relay: 'por relay (TURN)', direct: 'conexión directa' };

export function buildDiagnosticLines({ role, state, diagnostics }) {
  const { iceRelay, candidates = {}, local, remote } = diagnostics ?? {};
  const found = Object.entries(candidates).map(([type, n]) => `${type} ${n}`);
  const route = diagnostics?.route ?? null;
  return [
    ['Versión', APP_BUILD],
    ['Rol', role],
    [
      'Servidores ICE',
      iceRelay === null ? 'todavía no se pidieron' : iceRelay ? 'STUN + TURN de Cloudflare' : 'solo STUN (sin TURN)',
    ],
    ['Modo relay forzado', isRelayForced() ? 'sí' : 'no'],
    ['Estado del video', STATE_LABEL[state] ?? state],
    ['Candidatos propios', found.length ? found.join(' · ') : 'ninguno'],
    [
      'Ruta elegida',
      route ? `${ROUTE_LABEL[route]} (propio: ${local ?? '?'}, remoto: ${remote ?? '?'})` : 'sin determinar',
    ],
  ];
}

/** Panel plegable con lo necesario para saber por qué el video va (o no va) por relay. */
export default function Diagnostics({ role, state, route, diagnostics }) {
  const [copied, setCopied] = useState(false);
  const lines = buildDiagnosticLines({ role, state, diagnostics: { ...diagnostics, route } });

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(t);
  }, [copied]);

  async function handleCopy() {
    setCopied(await copyText(lines.map(([k, v]) => `${k}: ${v}`).join('\n')));
  }

  return (
    <details className="rounded-2xl border-4 border-ink/15 px-4">
      <summary className="flex min-h-14 cursor-pointer items-center font-bold">Diagnóstico</summary>
      <dl className="flex flex-col gap-1 pb-3 text-sm">
        {lines.map(([k, v]) => (
          <div key={k} className="flex flex-wrap gap-x-2">
            <dt className="font-bold">{k}:</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <button type="button" className="btn btn-secondary mb-4" onClick={handleCopy}>
        {copied ? <Check size={22} aria-hidden="true" /> : <Copy size={22} aria-hidden="true" />}
        {copied ? 'Diagnóstico copiado' : 'Copiar diagnóstico'}
      </button>
    </details>
  );
}
