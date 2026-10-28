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
| TURN | Cloudflare Realtime TURN | 1 TB gratis/mes (verificar condiciones vigentes) |
| Hosting frontend | Vercel o Cloudflare Pages | Gratis y excelente |
| Hosting backend | Render.com (plan free) | Fácil de desplegar |

---

## 3. Estructura de carpetas

```
appVideoVigilancia/
├── frontend/                 # React (Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CameraView.jsx
│   │   │   ├── ViewerView.jsx
│   │   │   ├── RoomCode.jsx
│   │   │   └── StatusIndicator.jsx
│   │   ├── hooks/
│   │   │   ├── useWebRTC.js
│   │   │   ├── useSocket.js
│   │   │   └── useWakeLock.js          # NUEVO: Wake Lock + fallback NoSleep
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Camera.jsx
│   │   │   └── Viewer.jsx
│   │   ├── utils/
│   │   │   ├── webrtc.js
│   │   │   └── constants.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── backend/                  # Node.js + Socket.io
│   ├── src/
│   │   ├── server.js
│   │   ├── rooms.js
│   │   └── turn.js                     # NUEVO: credenciales TURN temporales
│   ├── package.json
│   └── .env.example
│
├── memory.md                 # este archivo
└── README.md
```

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
- [ ] Servidor Express + Socket.io
- [ ] Salas por código aleatorio, máx. 2 participantes
- [ ] Eventos: `join-room`, `user-joined`, `user-left`
- [ ] Probar que dos dispositivos se unan a la misma sala

### Etapa 5 — WebRTC básico (Días 7-10) ⭐ la más importante
- [ ] Hook `useWebRTC.js`
- [ ] Flujo unidireccional: Cámara crea offer → Socket.io → Visor crea answer
- [ ] Intercambio de ICE candidates
- [ ] STUN de Google
- [ ] Visor muestra el stream recibido
- [ ] Probar en la misma red (solo STUN) antes de pasar a TURN

### Etapa 6 — Funcionamiento entre redes distintas (Días 11-13)
- [ ] Cuenta en Cloudflare y activar Realtime TURN
- [ ] Crear key de TURN y guardar credenciales en `.env` del backend
- [ ] Endpoint `GET /turn-credentials` en el backend
- [ ] El frontend pide las credenciales y las agrega a `RTCPeerConnection`
- [ ] Probar con dos redes distintas (datos móviles + WiFi)

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

- **Etapa en curso:** Etapa 4 (servidor de señalización)
- **Completadas:** Etapas 1, 2 y 3
- **Último avance:** cámara local funcionando en `/camera`: permiso, vista previa, cambio frontal/trasera, encender/apagar, 720p/24fps con fallback (2026-10-28)
- **Próximo paso:** Etapa 4 — hook `useSocket`, unirse a la sala desde Cámara y Visor, ver `user-joined`/`user-left` entre dos dispositivos reales (el backend ya tiene los eventos)
- **Bloqueos:** ninguno (el teléfono ya abre la app por la red local)

---

## 10. Registro de avances

| Fecha | Avance | Notas |
|---|---|---|
| 2026-10-28 | Plan definido, stack elegido y ajustes aplicados | Se crea este memory.md |
| 2026-10-28 | Scaffolding Etapa 1 generado | Backend: `/api/health`, `/api/rooms`, `/api/turn-credentials` (solo STUN), sockets `join-room`/`user-joined`/`user-left` con máx. 2 por sala (probado). Frontend: Vite + Tailwind + HTTPS local, rutas `/`, `/camera`, `/viewer` (placeholders), build OK |
| 2026-10-28 | Etapa 2 hecha | Componentes `PageLayout`, `RoomCode`, `RoomCodeInput`, `StatusIndicator`, `ViewerView`; hook `useRoomCode`; utilidades `roomCode`, `storage`, `clipboard`; rutas `/viewer` y `/viewer/:code`; estilos `.btn` |
| 2026-10-28 | Etapa 3 hecha | Utilidades `media.js` (fallback de restricciones, mensajes de error), hook `useCamera`, componente `CameraView`, página `Camera` con encender/apagar y cambio de cámara. Probado con cámara simulada: permiso denegado, cámara ocupada, track `ended`, apagar durante la espera del permiso y salida de la página |

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
| 2026-10-28 | La cámara no se enciende sola: el usuario toca "Encender cámara" | El permiso se pide con un gesto del usuario (más fiable en móviles) |
| 2026-10-28 | `facingMode` con `ideal` y la preferencia (trasera/frontal) se guarda en localStorage | No falla si el dispositivo solo tiene una cámara |
| 2026-10-28 | Cadena de restricciones: 720p/24fps → solo facingMode → `video: true` | Teléfonos viejos que rechazan resoluciones |
| 2026-10-28 | La cámara se apaga siempre al salir de la página y se libera la anterior antes de abrir otra | Teléfonos viejos no soportan dos cámaras abiertas a la vez |

---

## 12. Problemas conocidos y pendientes

- Verificar condiciones vigentes del plan gratuito de Cloudflare TURN y de Render antes de desplegar.
- ~~Teléfono no llegaba al PC por la red local~~ — resuelto (2026-10-28).
- Probar compatibilidad real en los teléfonos viejos (versión de Android/iOS y navegador).

---

## 13. Notas y aprendizajes

- En desarrollo `SERVER_URL` queda vacío (mismo origen vía proxy); en producción usar `VITE_SERVER_URL` apuntando a Render.
- Firewall de Windows: permitir Node.js en red privada para que el teléfono llegue al PC.

*(Agregar aquí hallazgos útiles durante el desarrollo: errores resueltos, configuraciones que funcionaron, comandos útiles.)*
