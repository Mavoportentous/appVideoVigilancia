import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { SERVER_URL } from '../utils/constants.js';

// Si tras este tiempo no hay conexión, probablemente Render está despertando.
export const WAKE_AFTER_MS = 5000;
const MAX_EVENTS = 20;

const INITIAL = { server: 'connecting', room: 'joining', peer: null, error: null };
const WHO = { camera: 'La cámara', viewer: 'El visor' };

/**
 * Conecta con el servidor de señalización y entra a la sala con un rol.
 *
 * server: connecting | waking | online | offline
 * room:   joining | waiting | paired | replaced | error
 * peer:   { id, role } del otro dispositivo, o null
 *
 * Al reconectarse (se cayó el WiFi, se bloqueó la pantalla…) vuelve a entrar solo.
 * `socket` queda disponible para que la Etapa 5 envíe offer/answer/ICE.
 */
export function useSocket({ code, role }) {
  const [socket, setSocket] = useState(null);
  const [conn, setConn] = useState(INITIAL);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    setConn(INITIAL);
    setEvents([]);

    const s = io(SERVER_URL || undefined, { reconnectionDelayMax: 5000, timeout: 30000 });
    setSocket(s);

    let counter = 0;
    const log = (text) =>
      setEvents((prev) => [{ id: (counter += 1), time: Date.now(), text }, ...prev].slice(0, MAX_EVENTS));

    const wakeTimer = setTimeout(
      () => setConn((c) => (c.server === 'connecting' ? { ...c, server: 'waking' } : c)),
      WAKE_AFTER_MS
    );

    s.on('connect', () => {
      clearTimeout(wakeTimer);
      setConn((c) => ({ ...c, server: 'online', room: 'joining', error: null }));

      s.emit('join-room', { code, role }, (res) => {
        if (!res?.ok) {
          setConn((c) => ({ ...c, room: 'error', error: res?.error ?? 'unknown' }));
          return;
        }
        setConn((c) => ({ ...c, room: res.peer ? 'paired' : 'waiting', peer: res.peer ?? null }));
        log(res.peer ? `${WHO[res.peer.role]} ya estaba en la sala` : 'Entraste a la sala');
      });
    });

    s.on('user-joined', (peer) => {
      setConn((c) => ({ ...c, room: 'paired', peer }));
      log(`${WHO[peer.role]} entró`);
    });

    s.on('user-left', (peer) => {
      setConn((c) => ({ ...c, room: 'waiting', peer: null }));
      log(`${WHO[peer.role]} salió`);
    });

    // Otro dispositivo (u otra pestaña) tomó este rol: se cierra para no pelear por la sala.
    s.on('replaced', () => {
      setConn((c) => ({ ...c, room: 'replaced', peer: null }));
      log('La sala se abrió en otro dispositivo');
      s.disconnect();
    });

    s.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') return; // lo cerramos nosotros
      if (reason === 'io server disconnect') s.connect(); // el servidor nos cerró: reintentar
      setConn((c) => ({ ...c, server: 'offline', room: 'joining', peer: null }));
      log('Se perdió la conexión con el servidor');
    });

    return () => {
      clearTimeout(wakeTimer);
      s.removeAllListeners();
      s.disconnect();
    };
  }, [code, role]);

  return { socket, ...conn, events };
}
