// Mismo alfabeto y longitud que backend/src/rooms.js (sin 0/O ni 1/I/L).
export const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 8;

/** Código aleatorio con crypto (sin sesgo de módulo). */
export function generateCode() {
  const limit = 256 - (256 % ALPHABET.length);
  let out = '';
  while (out.length < CODE_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH * 2));
    for (const b of bytes) {
      if (b < limit && out.length < CODE_LENGTH) out += ALPHABET[b % ALPHABET.length];
    }
  }
  return out;
}

/** Mayúsculas, sin espacios ni guiones, máximo CODE_LENGTH caracteres. */
export function normalizeCode(value) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH);
}

export function isValidCode(code) {
  return code.length === CODE_LENGTH && [...code].every((c) => ALPHABET.includes(c));
}

/** K2KXMN5S -> K2KX-MN5S (para mostrar). */
export function formatCode(code) {
  const c = normalizeCode(code);
  return c.length > 4 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}
