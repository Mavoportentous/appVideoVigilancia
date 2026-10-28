const STATES = {
  idle: { label: 'Sin conectar', dot: 'bg-ink/40' },
  connecting: { label: 'Conectando…', dot: 'bg-sun motion-safe:animate-pulse' },
  connected: { label: 'Conectado', dot: 'bg-pine' },
  disconnected: { label: 'Desconectado', dot: 'bg-signal' },
};

/** El estado se comunica con texto, no solo con color. */
export default function StatusIndicator({ status = 'idle', label }) {
  const state = STATES[status] ?? STATES.idle;
  return (
    <p role="status" className="flex items-center gap-3 text-lg font-bold">
      <span className={`h-4 w-4 shrink-0 rounded-full ${state.dot}`} aria-hidden="true" />
      {label ?? state.label}
    </p>
  );
}
