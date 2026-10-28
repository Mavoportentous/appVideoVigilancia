// localStorage puede fallar (modo privado, almacenamiento lleno): nunca debe romper la app.
export function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* sin almacenamiento: se ignora */
  }
}
