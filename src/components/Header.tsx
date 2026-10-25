import Image from "next/image";
import Link from "next/link";

// En-tête commun à toutes les pages : logo Interter cliquable.
// Simple, léger, cohérent — le fil rouge visuel du site.
export default function Header() {
  return (
    <header className="border-b-4 border-sable/40 bg-parchemin/60 sticky top-0 z-40">
      <div className="mx-auto max-w-5xl px-4 py-2 flex items-center gap-3">
        <Link href="/" aria-label="Interter — retour à l'accueil" className="flex items-center gap-3">
          <Image
            src="/logo/logo-192.svg"
            alt="Interter"
            width={44}
            height={44}
            className="drop-shadow"
            priority
          />
          <span className="font-cinzel font-black text-2xl text-gueules tracking-wide hidden sm:inline">
            Intert<span className="text-azur">er</span>
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-4 text-base font-bold">
          <Link href="/defi-du-jour" className="hover:text-gueules transition-colors">
            Quête du Jour
          </Link>
          <Link href="/essai" className="hover:text-gueules transition-colors">
            Essai
          </Link>
        </nav>
      </div>
    </header>
  );
}
