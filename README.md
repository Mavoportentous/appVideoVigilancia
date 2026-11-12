# Dog Camera

Convierte un teléfono viejo en cámara y míralo en vivo desde otro dispositivo (WebRTC).
Plan, decisiones y avances: ver `memory.md`.

## Requisitos
- Node.js 20 o superior
- Git Bash (o cualquier terminal)

## Arranque rápido en Windows (doble clic)

Haz doble clic en `iniciar-dogcam.bat` (en la raíz del proyecto). Hace lo siguiente:

1. Cierra lo que esté usando los puertos 5173 y 3001 (instancias anteriores).
2. Abre una ventana para el backend: `npm install`, crea `.env` si no existe y `npm run dev`.
3. Abre una ventana para el frontend: `npm install` y `npm run dev` (con `--strictPort`, así Vite nunca cambia de puerto en silencio).
4. Abre `https://localhost:5173` en el navegador.

Para detener todo, cierra las dos ventanas.

## Arranque manual (desarrollo)

Terminal 1 — backend:
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Terminal 2 — frontend:
```bash
cd frontend
npm install
npm run dev
```

- En el PC: https://localhost:5173
- En el teléfono (misma WiFi): https://<IP-de-tu-PC>:5173 (Vite la muestra como "Network")
- El certificado es autofirmado: acepta la advertencia del navegador ("Avanzado" → "Continuar").
- Comprobar backend: https://localhost:5173/api/health

> En Windows, permite Node.js en el Firewall (red privada) o el teléfono no podrá conectarse.

## TURN de Cloudflare (conexión entre redes distintas)

Sin TURN la app solo funciona si cámara y visor están en la misma red. TURN es el relevo
que permite conectarse desde datos móviles u otra WiFi. Según la documentación de Cloudflare
(consultada en 2026), los primeros 1.000 GB al mes son gratis y después cuesta 0,05 USD por GB;
revisa las condiciones vigentes en https://developers.cloudflare.com/realtime/turn/

### Configuración
1. Crea una cuenta gratuita en https://dash.cloudflare.com/sign-up
2. En el panel entra a **Realtime → TURN Service** y crea una **TURN key**
   (acceso directo: https://dash.cloudflare.com/?to=/:account/calls).
3. Copia el **Key ID** ("TURN Token ID") y el **API token**. El token se muestra una sola vez.
4. En `backend/.env` completa:
   ```
   CLOUDFLARE_TURN_KEY_ID=<tu key id>
   CLOUDFLARE_TURN_API_TOKEN=<tu api token>
   ```
5. Reinicia el backend. En su ventana debe decir `TURN de Cloudflare: configurado`.
6. Comprueba que entrega credenciales (en Git Bash):
   ```bash
   curl -sk https://localhost:5173/api/turn-credentials
   ```
   Debe responder con `"relay":true` y direcciones `turn:turn.cloudflare.com...`.
   Si responde `"relay":false`, mira la ventana del backend: ahí aparece el motivo.

En producción (Render) las mismas dos variables van en **Environment**. El token nunca llega al navegador:
el backend pide credenciales temporales (24 h) y las reutiliza durante 1 hora.
Si sospechas que alguien abusa del servicio, borra la TURN key en el panel de Cloudflare y crea otra.

### Probar TURN sin salir de tu WiFi
Abre la app con `?relay=1` al final de la dirección, en **cada dispositivo** (cámara y visor), por ejemplo
`https://192.168.1.102:5173/?relay=1`. Fuerza a WebRTC a usar solo el relay: desde la pantalla de inicio aparece el aviso
"Modo prueba: solo relay (TURN)" y los estados deben decir **por relay**. El modo queda activo mientras no cierres la
pestaña, aunque el parámetro desaparezca de la dirección al navegar. Para quitarlo, abre con `?relay=0`.
Comprueba que en el panel "Diagnóstico" diga "Modo relay forzado: sí".

### Probar con datos móviles
Un teléfono con datos móviles no puede llegar a `https://192.168.x.x:5173`. Opciones:
- **Túnel temporal de Cloudflare** (sin cuenta): instala `cloudflared`
  (`winget install --id Cloudflare.cloudflared`) y ejecuta
  `cloudflared tunnel --url https://localhost:5173 --no-tls-verify`.
  Imprime una dirección `https://....trycloudflare.com`: ábrela en el teléfono (con datos móviles) y en el visor.
  Mientras el túnel esté abierto, cualquiera con esa dirección puede ver la app: ciérralo al terminar.
- **Desplegar** el proyecto (Etapa 8: Vercel + Render).

Cuando funciona, cada pantalla indica por dónde viaja el video: **conexión directa** o **por relay**.
