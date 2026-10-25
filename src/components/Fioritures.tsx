// Fioritures médiévales : séparateurs et ornements en SVG,
// dans la palette parchemin/or du jeu. Usage décoratif, discret.

export function Separateur({ className = "" }: { className?: string }) {
  // Séparateur : losange central + traits élégants de part et d'autre
  return (
    <svg
      viewBox="0 0 200 16"
      className={`w-full max-w-[280px] mx-auto block ${className}`}
      aria-hidden="true"
    >
      <path
        d="M10 8 H80"
        stroke="#b8975a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M86 8 l14 -6 v12 Z" fill="#b8975a" />
      <path d="M100 8 l14 -6 v12 Z" fill="#c8102e" transform="scale(-1,1) translate(-200,0) translate(0,0)" />
      <path d="M100 2 l14 6 -14 6 -14 -6 Z" fill="#e8a020" stroke="#b8975a" strokeWidth="1.5" />
      <circle cx="100" cy="8" r="2.5" fill="#6b4f2a" />
      <path
        d="M120 8 H190"
        stroke="#b8975a"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Coins({ className = "" }: { className?: string }) {
  // Petit ornement de coin (losange + point), utilisé ensembles de 4
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M2 12 L12 2 L22 12 L12 22 Z" fill="none" stroke="#b8975a" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.5" fill="#e8a020" />
    </svg>
  );
}

export function RoseDesVents({ taille = 48, className = "" }: { taille?: number; className?: string }) {
  // Rose des vents : l'ornement de navigation des cartes anciennes
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="20" fill="none" stroke="#b8975a" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="14" fill="none" stroke="#b8975a" strokeWidth="1" />
      <path d="M24 4 L27 21 L24 24 L21 21 Z" fill="#c8102e" />
      <path d="M24 44 L27 27 L24 24 L21 27 Z" fill="#b8975a" />
      <path d="M4 24 L21 27 L24 24 L21 21 Z" fill="#b8975a" />
      <path d="M44 24 L27 27 L24 24 L27 21 Z" fill="#1f3a5f" />
      <circle cx="24" cy="24" r="3" fill="#e8a020" stroke="#b8975a" strokeWidth="1" />
    </svg>
  );
}
