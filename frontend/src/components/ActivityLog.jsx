const timeFormat = new Intl.DateTimeFormat('es-MX', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** Últimos eventos de la sala (quién entró o salió y cuándo). */
export default function ActivityLog({ events }) {
  if (!events.length) return null;
  return (
    <section aria-label="Actividad de la sala">
      <h2 className="font-bold">Actividad</h2>
      <ul className="mt-1 flex flex-col gap-1 text-sm text-ink/80">
        {events.slice(0, 5).map((e) => (
          <li key={e.id}>
            <time>{timeFormat.format(e.time)}</time> · {e.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
