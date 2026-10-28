import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PageLayout({ title, backTo = '/', backLabel = 'Inicio', children }) {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-5 px-5 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <header>
        <Link to={backTo} className="inline-flex min-h-12 items-center gap-2 font-bold text-pine">
          <ArrowLeft size={22} aria-hidden="true" />
          {backLabel}
        </Link>
        <h1 className="mt-1 text-3xl font-bold">{title}</h1>
      </header>
      <main className="flex flex-col gap-5">{children}</main>
    </div>
  );
}
