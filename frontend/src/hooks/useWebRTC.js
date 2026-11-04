import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createPeerConnection,
  describePeerState,
  getRouteType,
  limitBitrate,
  newSessionId,
  refreshIceServers,
  sendSignal,
} from '../utils/webrtc.js';
import { getIceServers } from '../utils/iceServers.js';

const ROUTE_POLL_MS = 10_000;
const ICE_REFRESH_MS = 6 * 60 * 60 * 1000; // las credenciales duran 24 h

/** Mientras hay conexión: ¿va directa o por relay? y renovar credenciales TURN. */
function useRouteAndRefresh(pcRef, state) {
  const [route, setRoute] = useState(null);

  useEffect(() => {
    if (state !== 'connected') {
      setRoute(null);
      return undefined;
    }
    let alive = true;
    const check = async () => {
      const pc = pcRef.current;
      if (!pc) return;
      const found = await getRouteType(pc).catch(() => null);
      if (alive) setRoute(found);
    };
    check();
    const poll = setInterval(check, ROUTE_POLL_MS);
    const refresh = setInterval(() => {
      if (pcRef.current) refreshIceServers(pcRef.current);
    }, ICE_REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(refresh);
    };
  }, [state, pcRef]);

  return route;
}

/*
 * Flujo (la cámara siempre es quien ofrece, así nunca chocan dos ofertas):
 *
 *   Visor  --ready-->  Cámara
 *   Cámara --offer-->  Visor        (y desde ahí, candidatos ICE en ambos sentidos)
 *   Visor  --answer--> Cámara
 *   Cámara --camera-state--> Visor  (cuando enciende o apaga la cámara)
 *
 * El visor pide ("ready") cuando ya está escuchando, así no importa quién entró primero.
 * Cada sesión lleva un `sid`: los mensajes de una sesión anterior se descartan.
 */

/** Cámara: envía su video al visor. `viewerId` es el id del visor en la sala (o null). */
export function useWebRTCSender({ socket, viewerId, stream }) {
  const [state, setState] = useState('idle');
  const pcRef = useRef(null);
  const senderRef = useRef(null);
  const sidRef = useRef(null);
  const pendingRef = useRef([]); // candidatos que llegaron antes que la respuesta
  const streamRef = useRef(stream);

  const closePc = useCallback(() => {
    const pc = pcRef.current;
    pcRef.current = null;
    senderRef.current = null;
    sidRef.current = null;
    pendingRef.current = [];
    if (pc) {
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.oniceconnectionstatechange = null;
      pc.close();
    }
    setState('idle');
  }, []);

  useEffect(() => {
    if (!socket) return undefined;

    async function startSession() {
      closePc();
      const sid = newSessionId();
      sidRef.current = sid;
      setState('negotiating');

      const { iceServers } = await getIceServers();
      if (sidRef.current !== sid) return; // llegó otra sesión o se cerró mientras esperábamos

      const pc = createPeerConnection(iceServers);
      pcRef.current = pc;

      const update = () => {
        if (pcRef.current === pc) setState(describePeerState(pc));
      };
      pc.onconnectionstatechange = update;
      pc.oniceconnectionstatechange = update;
      pc.onicecandidate = (e) => {
        if (e.candidate && pcRef.current === pc) {
          sendSignal(socket, { type: 'candidate', sid, candidate: e.candidate.toJSON() });
        }
      };

      // Siempre se negocia una línea de video; la imagen entra y sale con replaceTrack,
      // así encender, apagar o cambiar de cámara no obliga a renegociar.
      const { sender } = pc.addTransceiver('video', { direction: 'sendonly' });
      senderRef.current = sender;
      const track = streamRef.current?.getVideoTracks()[0] ?? null;
      if (track) await sender.replaceTrack(track);

      const offer = await pc.createOffer();
      if (pcRef.current !== pc) return;
      await pc.setLocalDescription(offer);
      if (pcRef.current !== pc) return;
      await limitBitrate(sender);

      sendSignal(socket, { type: 'offer', sid, sdp: pc.localDescription.sdp, cameraOn: Boolean(track) });
    }

    async function onSignal(msg) {
      try {
        if (msg.type === 'ready') return await startSession();

        if (msg.sid !== sidRef.current) return undefined; // sesión vieja
        const pc = pcRef.current;

        if (msg.type === 'answer') {
          if (!pc) return undefined;
          await pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp });
          const queued = pendingRef.current;
          pendingRef.current = [];
          for (const c of queued) await pc.addIceCandidate(c).catch(() => {});
        } else if (msg.type === 'candidate') {
          if (pc?.remoteDescription) await pc.addIceCandidate(msg.candidate).catch(() => {});
          else pendingRef.current.push(msg.candidate);
        }
      } catch (err) {
        console.warn('[webrtc:cámara]', err);
        setState('failed');
      }
      return undefined;
    }

    socket.on('signal', onSignal);
    return () => {
      socket.off('signal', onSignal);
      closePc();
    };
  }, [socket, closePc]);

  // El visor se fue: se cierra la conexión.
  useEffect(() => {
    if (!viewerId) closePc();
  }, [viewerId, closePc]);

  // La cámara se enciende, apaga o cambia: se reemplaza la imagen sin renegociar.
  useEffect(() => {
    streamRef.current = stream;
    const sender = senderRef.current;
    const sid = sidRef.current;
    if (!socket || !sender || !sid) return;
    const track = stream?.getVideoTracks()[0] ?? null;
    sender.replaceTrack(track).catch((err) => console.warn('[webrtc:cámara] replaceTrack', err));
    sendSignal(socket, { type: 'camera-state', sid, on: Boolean(track) });
  }, [stream, socket]);

  const route = useRouteAndRefresh(pcRef, state);
  return { state, route };
}

/** Visor: recibe el video. `cameraId` es el id de la cámara en la sala (o null). */
export function useWebRTCReceiver({ socket, cameraId }) {
  const [state, setState] = useState('idle');
  const [remoteStream, setRemoteStream] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const pcRef = useRef(null);
  const sidRef = useRef(null);
  const pendingRef = useRef([]);

  const closePc = useCallback(() => {
    const pc = pcRef.current;
    pcRef.current = null;
    sidRef.current = null;
    pendingRef.current = [];
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.oniceconnectionstatechange = null;
      pc.close();
    }
    setRemoteStream(null);
    setCameraOn(false);
    setState('idle');
  }, []);

  useEffect(() => {
    if (!socket) return undefined;

    async function handleOffer(msg) {
      closePc();
      sidRef.current = msg.sid; // desde ya: los candidatos que lleguen se guardan en cola
      setState('negotiating');
      setCameraOn(Boolean(msg.cameraOn));

      const { iceServers } = await getIceServers();
      if (sidRef.current !== msg.sid) return; // llegó otra oferta o se cerró mientras esperábamos

      const pc = createPeerConnection(iceServers);
      pcRef.current = pc;

      const update = () => {
        if (pcRef.current === pc) setState(describePeerState(pc));
      };
      pc.onconnectionstatechange = update;
      pc.oniceconnectionstatechange = update;
      pc.onicecandidate = (e) => {
        if (e.candidate && pcRef.current === pc) {
          sendSignal(socket, { type: 'candidate', sid: msg.sid, candidate: e.candidate.toJSON() });
        }
      };
      pc.ontrack = (e) => {
        if (pcRef.current !== pc) return;
        // Si la cámara estaba apagada al ofrecer, la pista llega sin stream asociado.
        setRemoteStream(e.streams?.[0] ?? new MediaStream([e.track]));
      };

      await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
      const queued = pendingRef.current;
      pendingRef.current = [];
      for (const c of queued) await pc.addIceCandidate(c).catch(() => {});

      const answer = await pc.createAnswer();
      if (pcRef.current !== pc) return;
      await pc.setLocalDescription(answer);
      if (pcRef.current !== pc) return;
      sendSignal(socket, { type: 'answer', sid: msg.sid, sdp: pc.localDescription.sdp });
    }

    async function onSignal(msg) {
      try {
        if (msg.type === 'offer') return await handleOffer(msg);

        if (msg.sid !== sidRef.current) return undefined; // sesión vieja
        const pc = pcRef.current;

        if (msg.type === 'candidate') {
          if (pc?.remoteDescription) await pc.addIceCandidate(msg.candidate).catch(() => {});
          else pendingRef.current.push(msg.candidate);
        } else if (msg.type === 'camera-state') {
          setCameraOn(Boolean(msg.on));
        }
      } catch (err) {
        console.warn('[webrtc:visor]', err);
        setState('failed');
      }
      return undefined;
    }

    socket.on('signal', onSignal);
    return () => {
      socket.off('signal', onSignal);
      closePc();
    };
  }, [socket, closePc]);

  // Pide el video: al encontrar a la cámara (o si la cámara cambia) y al reintentar.
  // Va después del efecto anterior para que el oyente ya exista al pedirlo.
  const request = useCallback(() => {
    if (socket) sendSignal(socket, { type: 'ready' });
  }, [socket]);

  useEffect(() => {
    if (cameraId) request();
    else closePc();
  }, [cameraId, request, closePc]);

  const retry = useCallback(() => {
    closePc();
    request();
  }, [closePc, request]);

  const route = useRouteAndRefresh(pcRef, state);
  return { state, route, remoteStream, cameraOn, retry };
}
