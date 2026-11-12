import { isRelayForced } from '../utils/webrtc.js';

/** Aviso visible mientras el modo de prueba "solo relay" está activo. */
export default function RelayBanner() {
  if (!isRelayForced()) return null;
  return (
    <p className="rounded-xl bg-sun/30 px-3 py-2 text-sm font-bold">
      Modo prueba: solo relay (TURN). Para quitarlo, abre la dirección con ?relay=0
    </p>
  );
}
