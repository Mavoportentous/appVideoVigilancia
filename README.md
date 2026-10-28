# Dog Camera

Convierte un teléfono viejo en cámara y míralo en vivo desde otro dispositivo (WebRTC).
Plan, decisiones y avances: ver `memory.md`.

## Requisitos
- Node.js 20 o superior
- Git Bash (o cualquier terminal)

## Arranque (desarrollo)

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
