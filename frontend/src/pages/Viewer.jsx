import { Link } from 'react-router-dom';

// Etapa 2: ingresar código de sala. Etapa 5: mostrar el video recibido.
export default function Viewer() {
  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <Link to="/" className="font-bold text-pine underline">Volver</Link>
      <h1 className="mt-4 text-2xl font-bold">Visor</h1>
      <p className="mt-2">Pendiente: Etapa 2 y 5.</p>
    </main>
  );
}
