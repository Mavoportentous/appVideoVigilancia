import { Link } from 'react-router-dom';
import { Camera, Eye } from 'lucide-react';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-4 px-5 py-8">
      <h1 className="text-3xl font-bold">¿Qué hará este teléfono?</h1>

      <Link
        to="/camera"
        className="flex items-center gap-4 rounded-2xl bg-pine px-6 py-8 text-xl font-bold text-paper active:bg-pine-dark"
      >
        <Camera size={36} aria-hidden="true" />
        Usar como cámara
      </Link>

      <Link
        to="/viewer"
        className="flex items-center gap-4 rounded-2xl border-4 border-pine px-6 py-8 text-xl font-bold text-pine active:bg-pine/10"
      >
        <Eye size={36} aria-hidden="true" />
        Ver cámara
      </Link>
    </main>
  );
}
