import { formatCode, normalizeCode } from '../utils/roomCode.js';

/** Campo para escribir el código: pone mayúsculas y el guion solo. */
export default function RoomCodeInput({ value, onChange, error }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="room-code" className="text-lg font-bold">
        Código de la cámara
      </label>
      <input
        id="room-code"
        type="text"
        value={formatCode(value)}
        onChange={(e) => onChange(normalizeCode(e.target.value))}
        placeholder="XXXX-XXXX"
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="go"
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? 'room-code-error' : undefined}
        className="min-h-16 w-full rounded-2xl border-4 border-ink/15 bg-white px-4 text-center text-3xl font-bold uppercase tracking-[0.12em] placeholder:text-ink/30"
      />
      <p id="room-code-error" role="alert" className="min-h-6 font-bold text-signal">
        {error}
      </p>
    </div>
  );
}
