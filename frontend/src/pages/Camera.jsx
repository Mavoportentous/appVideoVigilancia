import { Link } from 'react-router-dom';

// Etapa 3: permiso de cámara, vista local y cambio frontal/trasera.
export default function Camera() {
  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <Link to="/" className="font-bold text-pine underline">Volver</Link>
      <h1 className="mt-4 text-2xl font-bold">Cámara</h1>
      <p className="mt-2">Pendiente: Etapa 3.</p>
    </main>
  );
}
