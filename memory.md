# MEMORY.md — App de Video Vigilancia (dog-camera)

> **Instrucción para la IA (Claude u otra):** lee este archivo completo al inicio de cada sesión.
> Al terminar cada sesión, actualiza las secciones **Estado actual**, **Registro de avances** y **Decisiones**.
> No borres historial; agrega entradas nuevas con fecha.

---

## 1. Información del proyecto

- **Nombre:** dog-camera (App Video Vigilancia)
- **Ruta local:** `E:\LMK\appVideoVigilancia`
- **Objetivo:** usar un teléfono viejo como cámara y ver el video en vivo desde otro dispositivo, para vigilar al perro.
- **Responsable:** Miguel (desarrollo freelance, Ciudad de México)
- **Sin audio:** solo video.
- **Dispositivos objetivo:** teléfonos viejos (rendimiento limitado), diseño mobile-first.
- **Creado:** 2026-10-28
- **Repositorio:** https://github.com/Mavoportentous/appVideoVigilancia

---

## 2. Stack definitivo

| Capa | Tecnología | Motivo |
|---|---|---|
| Frontend | React + Vite | Rápido, moderno, fácil con IA |
| Estilos | Tailwind CSS | Bonito y responsive rápido |
| Señalización | Node.js + Express + Socket.io | Simple y fiable |
| WebRTC | API nativa del navegador | Más control, menos dependencias |
| STUN | Servidores públicos de Google | Gratis |
| TURN | Cloudflare Realtime TURN | Primeros 1.000 GB/mes gratis (compartidos con SFU), luego 0,05 USD/GB (verificado en la documentación, sep. 2026) |
| Hosting frontend | Vercel o Cloudflare Pages | Gratis y excelente |
| Hosting backend | Render.com (plan free) | Fácil de desplegar |

---

## 3. Estructura de carpetas

```
appVideoVigilancia/
├── frontend/                       # React (Vite) — HTTPS local con basic-ssl + proxy a /api y /socket.io
│   └── src/
│       ├── components/
│       │   ├── ActivityLog.jsx         # últimos eventos de la sala (quién entró/salió)
│       │   ├── CameraView.jsx          # vista previa local de la cámara
│       │   ├── ConnectionStatus.jsx    # estado servidor/sala/video con texto
│       │   ├── PageLayout.jsx
│       │   ├── RemoteVideo.jsx         # <video> del visor + mensajes (apagada, conectando, reintentar)
│       │   ├── RoomCode.jsx            # código grande + copiar
│       │   ├── RoomCodeInput.jsx       # campo para escribir el código
│       │   ├── StatusIndicator.jsx
│       │   └── ViewerView.jsx          # pantalla del visor (useSocket + useWebRTCReceiver)
│       ├── hooks/
│       │   ├── useCamera.js            # getUserMedia, frontal/trasera, errores, apagado
│       │   ├── useRoomCode.js          # código de la cámara (localStorage)
│       │   ├── useSocket.js            # socket.io + entrar a la sala con rol + estados
│       │   └── useWebRTC.js            # useWebRTCSender (cámara) y useWebRTCReceiver (visor)
│       ├── pages/                      # Home.jsx, Camera.jsx, Viewer.jsx
│       ├── utils/                      # clipboard, constants, iceServers, media, roomCode, storage, webrtc
│       ├── App.jsx  main.jsx  index.css
│       └── (rutas: /, /camera, /viewer, /viewer/:code)
│
├── backend/                        # Node.js + Express + Socket.io
│   └── src/
│       ├── server.js                   # /api/health, /api/rooms, /api/turn-credentials, join-room, signal
│       ├── turn.js                     # credenciales TURN de Cloudflare (caché, respaldo STUN)
│       └── rooms.js                    # salas: 1 cámara + 1 visor, el nuevo reemplaza al anterior
│
├── iniciar-dogcam.bat              # doble clic: libera puertos y levanta backend + frontend
├── memory.md                       # este archivo
└── README.md
```
Pendiente de crear: `useWakeLock.js` (Etapa 7).

---

## 4. Librerías

**Frontend (`frontend/package.json`):**
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "socket.io-client": "^4.7.5",
    "lucide-react": "^0.441.0",
    "nosleep.js": "^0.12.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "@vitejs/plugin-basic-ssl": "^1.1.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.10",
    "vite": "^5.4.2"
  }
}
```

**Backend (`backend/package.json`):**
```json
{
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "socket.io": "^4.7.5"
  }
}
```
> Se sustituye `uuid` por `crypto.randomBytes` (nativo de Node) para generar los códigos de sala. Si se prefiere `uuid`, conservarlo.

**Variables de entorno (`backend/.env.example`):**
```
PORT=3001
FRONTEND_URL=http://localhost:5173
CLOUDFLARE_TURN_KEY_ID=
CLOUDFLARE_TURN_API_TOKEN=
```
> El token de Cloudflare **nunca** va en el frontend.

---

## 5. Ajustes aplicados al plan original

1. **HTTPS obligatorio para la cámara.** `getUserMedia` solo funciona en `localhost` o HTTPS. Para probar en el teléfono por IP local: plugin `@vitejs/plugin-basic-ssl` en Vite, o un túnel (ngrok / Cloudflare Tunnel), o desplegar pronto en Vercel.
2. **Credenciales TURN desde el backend.** Endpoint `GET /turn-credentials` que pide credenciales temporales a la API de Cloudflare y las devuelve al cliente. Token guardado solo en variables de entorno del servidor.
3. **Render free se duerme** (~15 min sin tráfico, arranque de ~1 min). El frontend muestra "Despertando servidor…" al conectar; opcionalmente un ping periódico (UptimeRobot) para mantenerlo activo.
4. **Wake Lock con fallback.** Usar la Wake Lock API; si no existe (navegadores viejos, iOS < 16.4), usar `NoSleep.js`. Recomendar dejar el teléfono cámara enchufado.
5. **Reconexión con ICE restart.** Ante `iceConnectionState` `disconnected` o `failed`, llamar a `pc.restartIce()` en lugar de recrear toda la conexión.
6. **Fallback de constraints.** Si `getUserMedia` lanza `OverconstrainedError`, reintentar con `{ video: true, audio: false }`.
7. **Seguridad de salas.** Códigos aleatorios de 6–8 caracteres alfanuméricos (ej. `K7M2QX9P`), máximo **2 participantes** por sala (1 cámara + 1 visor), salas se eliminan al quedar vacías.

---

## 6. Configuración WebRTC para teléfonos viejos

```javascript
const constraints = {
  video: {
    width: { ideal: 1280, max: 1280 },
    height: { ideal: 720, max: 720 },
    frameRate: { ideal: 24, max: 30 },
    facingMode: "environment" // cámara trasera
  },
  audio: false
};

async function getCameraStream() {
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    if (err.name === "OverconstrainedError") {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
    throw err;
  }
}
```

---

## 7. Plan de desarrollo por etapas

Marca con `[x]` al completar. Fechas estimadas son orientativas.

### Etapa 1 — Preparación (Día 1)
- [x] Crear carpeta del proyecto en `E:\LMK\appVideoVigilancia`
- [x] Inicializar frontend con Vite + React
- [x] Inicializar backend con Node.js
- [x] Configurar Tailwind
- [x] Configurar HTTPS local en Vite (`basic-ssl`)
- [x] Subir ambos a GitHub

### Etapa 2 — Interfaz básica (Días 2-3)
- [x] Home (`/`) con botones "Usar como Cámara" y "Ver Cámara"
- [x] Página Cámara (`/camera`)
- [x] Página Visor (`/viewer`)
- [x] Componente para generar / ingresar código de sala
- [x] Diseño mobile-first (botones grandes)

### Etapa 3 — Cámara local (Día 4)
- [x] Pedir permiso de cámara
- [x] Mostrar video local
- [x] Elegir cámara frontal / trasera
- [x] Resolución baja (640x480 o máx. 1280x720) con fallback ante `OverconstrainedError`
- [x] Botón apagar / encender cámara

### Etapa 4 — Servidor de señalización (Días 5-6)
- [x] Servidor Express + Socket.io
- [x] Salas por código aleatorio, máx. 2 participantes
- [x] Eventos: `join-room`, `user-joined`, `user-left`
- [x] Probar que dos dispositivos reales se unan a la misma sala (probado en PC + Samsung Galaxy S26; el Pixel 8 Pro no abre la app, ver sección 12)

### Etapa 5 — WebRTC básico (Días 7-10) ⭐ la más importante
- [x] Hook `useWebRTC.js`
- [x] Flujo unidireccional: Cámara crea offer → Socket.io → Visor crea answer
- [x] Intercambio de ICE candidates
- [x] STUN de Google
- [x] Visor muestra el stream recibido
- [ ] Probar en la misma red (solo STUN) con dispositivos reales antes de pasar a TURN (pendiente: prueba del usuario)

### Etapa 6 — Funcionamiento entre redes distintas (Días 11-13)
- [x] Cuenta en Cloudflare y activar Realtime TURN
- [x] Crear key de TURN y guardar credenciales en `.env` del backend (confirmado: `/api/turn-credentials` responde `"relay":true`)
- [x] Endpoint `GET /api/turn-credentials` en el backend (`turn.js`: caché 1 h, respaldo STUN, límite 60 peticiones/10 min por IP)
- [x] El frontend pide las credenciales y las agrega a `RTCPeerConnection` (`utils/iceServers.js`)
- [x] Probar con dos redes distintas (datos móviles + WiFi): con el túnel de Cloudflare el video conectó con ruta directa srflx–srflx y el visor reunió candidatos `relay` (TURN alcanzable)
- [ ] Probar el relay forzado real: abrir cámara y visor con `?relay=1` (también por el túnel) y confirmar que el video circula "por relay" — comprueba el camino de datos por TURN, que aún no se ha ejercitado en real. La 1.ª prueba (2026-11-10) NO fue válida: `?relay=1` se perdía al pulsar "Ver cámara" (bug corregido en `etapa-6c`); repetirla con esa versión y comprobar "Modo relay forzado: sí" en el diagnóstico

### Etapa 7 — Estabilidad y experiencia de uso (Días 14-18)
- [ ] Indicador de estado (Conectando / Conectado / Desconectado)
- [ ] Reconexión automática con `restartIce()`
- [ ] Wake Lock + fallback NoSleep.js
- [ ] Manejo de errores (cámara ocupada, permisos denegados, etc.)
- [ ] Botón "Copiar código de sala"
- [ ] Mensaje "Despertando servidor…" por el cold start de Render
- [ ] Guardar código de sala en `localStorage`
- [ ] Mejoras visuales y feedback claro

### Etapa 8 — Despliegue (Días 19-21)
- [ ] Backend en Render.com
- [ ] Frontend en Vercel
- [ ] Variables de entorno configuradas en ambos
- [ ] Probar en teléfonos reales (especialmente los viejos)

---

## 8. Consejos de desarrollo

- Probar en el teléfono real lo antes posible, no solo en el PC.
- Empezar con STUN solamente; agregar TURN cuando funcione en la misma red.
- Depurar con `chrome://inspect` en el navegador del teléfono.
- Guardar el código de sala en `localStorage`.
- Mantener ligero el teléfono "Cámara": pocas animaciones, pocos re-renders.

---

## 9. Estado actual

- **Etapa en curso:** Etapa 6 (TURN) — casi cerrada: falta repetir la prueba del relay forzado con la versión `etapa-6c`
- **Completadas:** Etapas 1, 2, 3 y 4. Etapa 5 con una casilla pendiente (prueba del usuario en la misma WiFi)
- **Último avance:** corregido el modo `?relay=1`, que se perdía al navegar de Inicio a otra página (el parámetro solo se leía en páginas con `PageLayout`); ahora se captura al arrancar (`main.jsx`) y el aviso aparece también en Inicio (2026-11-12)
- **Próximo paso:** el usuario aplica `etapa6c-cambios.zip` y repite la prueba: abrir cámara y visor con `?relay=1` (también por el túnel), comprobar "Modo relay forzado: sí" y "por relay"; después, Etapa 7 (estabilidad: reconexión automática con `restartIce`, Wake Lock, errores, copiar código)
- **Bloqueos:** ninguno

---

## 10. Registro de avances

| Fecha | Avance | Notas |
|---|---|---|
| 2026-10-28 | Plan definido, stack elegido y ajustes aplicados | Se crea este memory.md |
| 2026-10-28 | Scaffolding Etapa 1 generado | Backend: `/api/health`, `/api/rooms`, `/api/turn-credentials` (solo STUN), sockets `join-room`/`user-joined`/`user-left` con máx. 2 por sala (probado). Frontend: Vite + Tailwind + HTTPS local, rutas `/`, `/camera`, `/viewer` (placeholders), build OK |
| 2026-10-28 | Etapa 2 hecha | Componentes `PageLayout`, `RoomCode`, `RoomCodeInput`, `StatusIndicator`, `ViewerView`; hook `useRoomCode`; utilidades `roomCode`, `storage`, `clipboard`; rutas `/viewer` y `/viewer/:code`; estilos `.btn` |
| 2026-10-28 | Etapa 3 hecha | Utilidades `media.js` (fallback de restricciones, mensajes de error), hook `useCamera`, componente `CameraView`, página `Camera` con encender/apagar y cambio de cámara. Probado con cámara simulada: permiso denegado, cámara ocupada, track `ended`, apagar durante la espera del permiso y salida de la página |
| 2026-10-31 | Etapa 4 (código) hecha | Backend con roles (1 cámara + 1 visor, el nuevo reemplaza al anterior). Frontend: hook `useSocket`, `ConnectionStatus`, `ActivityLog`; Cámara y Visor entran a la sala y muestran estado. Pruebas: 9 de backend, 13 de frontend (servidor simulado) y 1 de punta a punta por el proxy HTTPS |
| 2026-10-31 | Etapa 4 verificada en dispositivos reales | PC + Samsung Galaxy S26 OK. Pixel 8 Pro: `ERR_TOO_MANY_RETRIES` al abrir `https://<IP>:5173` (error del navegador/red del Pixel, mismo servidor y URL que sí funcionan en los otros) |
| 2026-10-31 | Etapa 5 (código) hecha | Backend: reenvío `signal` (ready/offer/answer/candidate/camera-state). Frontend: `utils/webrtc.js`, `useWebRTCSender`/`useWebRTCReceiver`, `RemoteVideo`. Prueba con WebRTC real (`@roamhq/wrtc`) + backend real + las dos páginas: conexión con cámara apagada, encender/apagar/re-encender, cambio de cámara en vivo, recarga del visor y de la cámara; ~30 cuadros por 1,5 s en cada caso |
| 2026-11-03 | Etapa 6 (código) hecha | Backend: `turn.js` (POST a `generate-ice-servers`, ttl 24 h, caché 1 h, respaldo STUN, límite por IP). Frontend: `iceServers.js`, `iceTransportPolicy` con `?relay=1`, `getRouteType` (directa/relay) en ambas pantallas, renovación de credenciales cada 6 h con `setConfiguration`. Pruebas: 6 de backend con Cloudflare simulado; 5 de utilidades; app completa (Cámara + Visor + backend + WebRTC real) en 3 escenarios, incluido relay forzado a través de un TURN real local (`node-turn`) |
| 2026-11-04 | Diagnóstico de la ruta de video | Panel `Diagnostics.jsx` (versión `APP_BUILD`, ICE con/sin TURN, candidatos por tipo, ruta elegida, copiar). `getRouteInfo` devuelve también el tipo de candidato de cada extremo; consulta cada 1,5 s mientras la ruta es desconocida y luego cada 10 s. Backend: línea de registro `[turn] credenciales entregadas · relay: …`. Probado con WebRTC real en 3 escenarios (relay forzado, normal con TURN, normal sin TURN) |
| 2026-11-09 | `react-router-dom` 6.30 → 7.18.5 | Cierra las 2 avisos moderados de producción del `npm audit`. Cambio solo en `frontend/package.json` (la app usa BrowserRouter/MemoryRouter/Routes/Route/Link/Navigate/useNavigate/useParams, sin cambios de código). Pruebas de navegación en jsdom: enlaces, formulario del visor con validaciones, `/viewer/:code`, redirección por código inválido, ruta desconocida y BrowserRouter con botón Atrás. `npm audit --omit=dev` = 0 |
| 2026-11-12 | Corrección del modo `?relay=1` (`etapa-6c`) | Causa: `isRelayForced()` solo se llamaba en páginas con `PageLayout`; Inicio no lo hacía y al pulsar un enlace el parámetro desaparecía de la URL, así que nunca se guardaba. Ahora `main.jsx` lo llama al arrancar y `RelayBanner` (nuevo) se muestra en Inicio y en `PageLayout`. Prueba con la entrada real (`main.jsx`) en jsdom, con y sin parámetro; la misma prueba falla con el código anterior |

---

## 11. Decisiones tomadas

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-10-28 | React + Vite, Tailwind, Express + Socket.io, WebRTC nativo | Simplicidad y menos dependencias |
| 2026-10-28 | TURN con Cloudflare, credenciales generadas en el backend | Token no expuesto en el cliente |
| 2026-10-28 | Salas con código aleatorio largo y máx. 2 participantes | Evitar que adivinen el código |
| 2026-10-28 | Wake Lock con fallback NoSleep.js | Compatibilidad con teléfonos viejos |
| 2026-10-28 | Proxy de Vite para `/api` y `/socket.io` en desarrollo | Evita "mixed content" (frontend HTTPS vs backend HTTP) al probar en el teléfono |
| 2026-10-28 | Terminal preferida: Git Bash | Comandos del README en sintaxis bash |
| 2026-10-28 | El código de sala de la cámara se genera en el teléfono (crypto) y se guarda en localStorage | No depende de que Render esté despierto; el servidor acepta cualquier código válido al hacer `join-room`. `/api/rooms` queda disponible pero sin uso |
| 2026-10-28 | Códigos: 8 caracteres, alfabeto sin 0/O/1/I/L, se muestran como `XXXX-XXXX` | Evitar confusiones al escribirlos |
| 2026-10-28 | Script `iniciar-dogcam.bat` (doble clic) para levantar backend y frontend | Evita repetir comandos; libera los puertos 5173/3001 y usa `--strictPort` para que Vite no cambie de puerto sin avisar |
| 2026-10-28 | La cámara no se enciende sola: el usuario toca "Encender cámara" | El permiso se pide con un gesto del usuario (más fiable en móviles) |
| 2026-10-28 | `facingMode` con `ideal` y la preferencia (trasera/frontal) se guarda en localStorage | No falla si el dispositivo solo tiene una cámara |
| 2026-10-28 | Cadena de restricciones: 720p/24fps → solo facingMode → `video: true` | Teléfonos viejos que rechazan resoluciones |
| 2026-10-28 | La cámara se apaga siempre al salir de la página y se libera la anterior antes de abrir otra | Teléfonos viejos no soportan dos cámaras abiertas a la vez |
| 2026-10-31 | `join-room` recibe `{code, role}`; roles `camera` y `viewer`, máx. 1 de cada uno por sala | Evita dos cámaras o dos visores en la misma sala |
| 2026-10-31 | Si el rol ya está ocupado, la conexión nueva REEMPLAZA a la anterior (la vieja recibe `replaced`) | Permite reconectar un teléfono cuya conexión quedó colgada; `room-full` ya no existe |
| 2026-10-31 | Al reconectar, el cliente vuelve a entrar a la sala solo | WiFi inestable y teléfonos que suspenden la conexión |
| 2026-10-31 | Tras 5 s sin conectar se muestra "Despertando el servidor…" | Cold start del plan free de Render |
| 2026-10-31 | La cámara siempre es quien hace la oferta; el visor pide con `ready` cuando ya escucha | Evita choques de ofertas y condiciones de carrera sobre quién entró primero |
| 2026-10-31 | Cada sesión WebRTC lleva un `sid`; los mensajes de sesiones viejas se descartan | Recargas y reconexiones sin mezclar candidatos de sesiones anteriores |
| 2026-10-31 | Siempre se negocia una línea de video `sendonly`; la imagen entra/sale con `replaceTrack` | Encender, apagar o cambiar de cámara sin renegociar |
| 2026-10-31 | La cámara avisa su estado con `camera-state` | El visor muestra "La cámara está apagada" de forma fiable |
| 2026-10-31 | Tope de bitrate de 1,2 Mbps (`MAX_VIDEO_BITRATE`) | Teléfonos viejos y cuota de TURN (1.000 GB/mes ≈ 77 días a 1,2 Mbps continuo si TODO pasara por relay; el relay solo se usa cuando no hay ruta directa) |
| 2026-10-31 | El visor tiene botón "Reintentar" si falla el video; la reconexión automática queda para la Etapa 7 | Mantener la Etapa 5 simple |
| 2026-11-03 | Endpoint de Cloudflare: `POST /v1/turn/keys/{id}/credentials/generate-ice-servers` (formato nuevo, lista de iceServers) | Es el vigente en la documentación; el código acepta también el formato anterior (objeto) y quita el puerto 53 (bloqueado en navegadores) |
| 2026-11-03 | Credenciales de 24 h, reutilizadas 1 h en el backend; el cliente las renueva cada 6 h | Pocas llamadas a Cloudflare y la cámara puede estar días encendida |
| 2026-11-03 | Si Cloudflare falla o no está configurado, el backend responde con STUN y `relay:false` | La app sigue funcionando en la misma red; el motivo queda en la consola del backend |
| 2026-11-03 | `GET /api/turn-credentials` es público pero limitado a 60 peticiones/10 min por IP | No hay forma de autenticar a un visitante sin cuentas; el límite y la caducidad reducen el abuso. Si hay abuso, borrar la TURN key en Cloudflare |
| 2026-11-03 | Modo de prueba `?relay=1` (se recuerda en la sesión; `?relay=0` lo quita) | Validar TURN sin salir de la misma WiFi |
| 2026-11-03 | La interfaz indica "conexión directa" o "por relay" | Saber si el video usa TURN (y consume cuota) |
| 2026-11-04 | `APP_BUILD` (en `constants.js`) se muestra en el panel de diagnóstico; actualizarlo en cada etapa | Saber con certeza qué versión del código está cargada en cada dispositivo |
| 2026-11-04 | NO actualizar dependencias mientras se depura la prueba de TURN | Cambiar una sola cosa a la vez; el `npm audit` se atiende después (ver sección 12) |
| 2026-11-09 | Pendiente de decidir antes de la Etapa 8: actualizar Vite/esbuild (solo desarrollo; el `npm audit` completo marca el salto a Vite 8) | `npm audit --omit=dev` ya no reporta nada; el aviso restante es del servidor de desarrollo |
| 2026-11-12 | Los parámetros de URL que activan modos de prueba se leen en `main.jsx`, antes de renderizar | La navegación interna (`<Link>`) borra la query; si se leen más tarde, se pierden |

---

## 12. Problemas conocidos y pendientes

- Verificar condiciones vigentes del plan gratuito de Cloudflare TURN y de Render antes de desplegar.
- ~~Teléfono no llegaba al PC por la red local~~ — resuelto (2026-10-28).
- ~~Pixel 8 Pro no abría la app (`ERR_TOO_MANY_RETRIES`)~~ — resuelto: era una regla de seguridad de Chrome (2026-10-31).
- Mensajes de Vite `ws proxy socket error: ECONNRESET` y `npm warn install-scripts` son normales (un teléfono cerró la conexión de golpe / aviso de npm 12); no afectan.
- ~~`npm audit` de producción (react-router)~~ — resuelto (2026-11-09) con `react-router-dom` 7.18.5. Sigue el aviso de desarrollo (`esbuild`/`vite`, ver sección 11); revisar antes de la Etapa 8. Con `npm audit --omit=dev` solo se ven las dependencias de producción.
- Falta probar la conexión real por TURN de Cloudflare (las credenciales ya se obtienen bien; la conexión solo se probó con un Cloudflare simulado y un TURN local).
- ~~`cloudflared` no instalado~~ — resuelto: ya funciona (`cloudflared tunnel --url https://localhost:5173 --no-tls-verify` crea el túnel y pasa las comprobaciones).
- Si la interfaz muestra siempre "por relay" incluso en la misma WiFi, revisar que no quedó `?relay=1` activo en la sesión.
- Probar compatibilidad real en los teléfonos viejos (versión de Android/iOS y navegador).

---

## 13. Notas y aprendizajes

- En desarrollo `SERVER_URL` queda vacío (mismo origen vía proxy); en producción usar `VITE_SERVER_URL` apuntando a Render.
- Firewall de Windows: permitir Node.js en red privada para que el teléfono llegue al PC.

- Arranque: doble clic en `iniciar-dogcam.bat`. Si la app no abre en el teléfono, revisar la línea `Network:` de la ventana del Frontend (la IP puede cambiar).

- **Protocolo de señalización (socket.io):**
  - Cliente → servidor: `join-room` con `{ code, role: 'camera' | 'viewer' }` y ack `{ ok: true, code, role, peer: {id, role} | null }` o `{ ok: false, error: 'invalid-code' | 'invalid-role' }`.
  - Servidor → cliente: `user-joined {id, role}`, `user-left {id, role}`, `replaced`.
  - `signal` (ambos sentidos, el servidor solo reenvía al otro de la sala; máx. 20 KB, tipos permitidos: `ready`, `offer`, `answer`, `candidate`, `camera-state`). Flujo: visor→`ready` · cámara→`offer {sid, sdp, cameraOn}` · visor→`answer {sid, sdp}` · ambos→`candidate {sid, candidate}` · cámara→`camera-state {sid, on}`.
  - `useWebRTCSender({socket, viewerId, stream})` → `{state}`; `useWebRTCReceiver({socket, cameraId})` → `{state, remoteStream, cameraOn, retry}`. `state`: idle | negotiating | connected | disconnected | failed.
  - `useSocket({ code, role })` devuelve `{ socket, server, room, peer, error, events }`. `server`: connecting | waking | online | offline. `room`: joining | waiting | paired | replaced | error.
- **API de Cloudflare TURN (verificada en la documentación, sep. 2026):** `POST https://rtc.live.cloudflare.com/v1/turn/keys/$KEY_ID/credentials/generate-ice-servers` con `Authorization: Bearer $TOKEN` y cuerpo `{"ttl": 86400}`; responde 201 con `{ iceServers: [ {urls:[stun…]}, {urls:[turn…], username, credential} ] }`. Las TURN keys no sirven directamente como credenciales. Cuota: primeros 1.000 GB/mes gratis (compartidos con SFU), luego 0,05 USD/GB de salida.
- **Backend → cliente:** `GET /api/turn-credentials` → `{ iceServers, relay }` (`relay:true` si hay TURN). `useWebRTCSender` y `useWebRTCReceiver` ahora devuelven también `route` ('relay' | 'direct' | null).
- **Si el entorno de trabajo de Claude se reinicia** (se pierde el repositorio temporal): reconstruirlo aplicando en orden los zips de `/mnt/user-data/outputs`: `appVideoVigilancia.zip`, `etapa2-cambios`, `etapa3-cambios`, `etapa4-cambios`, `etapa5-cambios`, `etapa6-cambios`, `etapa6b-cambios`, `react-router-7`, `etapa6c-cambios` (y copiar `iniciar-dogcam.bat` y `memory.md`). Después `git init` + commit para calcular el siguiente paquete de cambios.
- **Cómo leer el diagnóstico:** abrir el panel "Diagnóstico" en Cámara y en Visor y usar "Copiar diagnóstico". Si el panel no existe, el dispositivo tiene archivos viejos. "Servidores ICE: solo STUN" = el backend no entregó TURN (ver `[turn]` en su consola). "Candidatos propios" sin `relay` con TURN disponible = no se alcanzó el servidor TURN desde esa red. "Ruta elegida": relay = usa cuota de Cloudflare; directa = no.
- **Diagnóstico real del usuario con el túnel (2026-11-09):** `Candidatos propios: host 1 · srflx 1 · relay 4` y `Ruta elegida: conexión directa (propio: srflx, remoto: srflx)` = TURN alcanzable (4 candidatos relay) pero el video no lo necesitó: los NAT permitieron conexión directa. En la misma red: host–host.
- **Probar entre redes distintas:** un teléfono con datos móviles no llega a la IP local del PC. Opciones: túnel `cloudflared tunnel --url https://localhost:5173 --no-tls-verify` (sin cuenta; sugerido, NO probado en este entorno) o desplegar (Etapa 8). Con HTTPS, Vite no bloquea hosts desconocidos, así que no hace falta tocar `vite.config.js`.
- **Prueba de la Etapa 4 con dos dispositivos:** (1) teléfono en `/camera` y PC o segundo teléfono en `/viewer` con el mismo código → ambos deben mostrar "conectado" y un registro de actividad; (2) cerrar o recargar uno → el otro muestra "salió" y vuelve a "Esperando…"; (3) apagar el WiFi del teléfono unos segundos y volver a encenderlo → se reconecta y vuelve a emparejarse; (4) abrir el mismo código en un tercer dispositivo con el mismo rol → el primero muestra "La sala se abrió en otro dispositivo".
- **Prueba de la Etapa 5 con dispositivos reales (misma WiFi, solo STUN):** (1) teléfono en `/camera`, PC o segundo teléfono en `/viewer` con el mismo código → el visor debe decir "La cámara está apagada" y la cámara "Visor conectado · sin imagen"; (2) tocar "Encender cámara" → el visor muestra el video en vivo y la cámara dice "enviando video"; (3) apagar y volver a encender; (4) cambiar entre frontal y trasera con el video en curso; (5) recargar el visor y luego la cámara → el video debe volver; (6) anotar la resolución y la fluidez en los teléfonos viejos. Con una red distinta (datos móviles) todavía NO funcionará: falta TURN (Etapa 6).
- En desarrollo (React StrictMode) el efecto se monta dos veces; no afecta a producción.

*(Agregar aquí hallazgos útiles durante el desarrollo: errores resueltos, configuraciones que funcionaron, comandos útiles.)*
