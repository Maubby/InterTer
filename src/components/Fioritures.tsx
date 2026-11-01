// Fioritures médiévales : séparateurs et ornements en SVG,
// dans la palette parchemin/or du jeu. Usage décoratif, discret.

import { useEffect, useState } from "react";

// Gerbe d'éclats (bonne réponse, quête accomplie) : losanges et fleurons
// d'or, de gueules, d'azur et de sinople qui jaillissent du point donné.
const COULEURS_ECLATS = ["#e8b33d", "#c8102e", "#1d4e89", "#e8b33d", "#1e7d4e"];
export function Eclats({
  nombre = 16,
  portee = 110,
  className = "",
}: {
  nombre?: number;
  portee?: number;
  className?: string;
}) {
  return (
    <span className={`absolute pointer-events-none ${className}`} aria-hidden="true">
      {Array.from({ length: nombre }, (_, i) => {
        const couleur = COULEURS_ECLATS[i % COULEURS_ECLATS.length];
        const style = {
          "--a": `${(360 / nombre) * i + (i % 2) * 9}deg`,
          "--d": `${portee * (0.7 + ((i * 37) % 30) / 100)}px`,
          animationDelay: `${(i % 4) * 40}ms`,
        } as React.CSSProperties;
        return (
          <svg key={i} viewBox="0 0 20 20" className="eclat" style={style}>
            {i % 3 === 0 ? (
              <path d="M10 1 12.5 7.5 19 10 12.5 12.5 10 19 7.5 12.5 1 10 7.5 7.5Z" fill={couleur} stroke="#2b2118" strokeWidth="0.8" />
            ) : (
              <path d="M10 2 17 10 10 18 3 10Z" fill={couleur} stroke="#2b2118" strokeWidth="0.8" />
            )}
          </svg>
        );
      })}
    </span>
  );
}

// Compteur qui défile de 0 jusqu'à la valeur (le score qui monte)
export function Compteur({ valeur, duree = 1200 }: { valeur: number; duree?: number }) {
  const [affiche, setAffiche] = useState(0);
  useEffect(() => {
    // Mouvement réduit demandé : la valeur s'affiche d'un coup
    const instantane = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let debut: number | null = null;
    let raf = 0;
    const pas = (t: number) => {
      if (debut === null) debut = t;
      const p = instantane ? 1 : Math.min(1, (t - debut) / duree);
      setAffiche(Math.round(valeur * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [valeur, duree]);
  return <>{affiche.toLocaleString("fr-FR")}</>;
}

export function Separateur({ className = "" }: { className?: string }) {
  // Bout-de-ligne de manuscrit : quadrilobe d'azur au cœur de gueules,
  // rinceaux d'or feuillus de part et d'autre
  return (
    <svg
      viewBox="0 0 240 24"
      className={`w-full max-w-[300px] mx-auto block ${className}`}
      aria-hidden="true"
    >
      {[1, -1].map((sens) => (
        <g key={sens} transform={sens === -1 ? "translate(240,0) scale(-1,1)" : undefined}>
          <path d="M14 12 H96" stroke="#e8b33d" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M30 15 H90" stroke="#c8102e" strokeWidth="0.9" strokeLinecap="round" opacity="0.6" />
          <path d="M14 12 q-6 -7 -11 -2 q5 5 11 2Z" fill="#1e7d4e" />
          <path d="M48 12 q4 -7 10 -6 q-3 6 -10 6Z" fill="#1e7d4e" />
          <path d="M72 12 q4 7 10 6 q-3 -6 -10 -6Z" fill="#1e7d4e" />
          <circle cx="60" cy="12" r="1.6" fill="#c8102e" />
        </g>
      ))}
      <g transform="translate(120,12)">
        {[0, 90, 180, 270].map((a) => (
          <circle key={a} cx="0" cy="-6" r="5" transform={`rotate(${a})`} fill="#1d4e89" stroke="#e8b33d" strokeWidth="1.4" />
        ))}
        <circle r="4.2" fill="#c8102e" stroke="#e8b33d" strokeWidth="1.4" />
        <circle r="1.4" fill="#e8b33d" />
      </g>
    </svg>
  );
}

// Les feuillets de la quête : un onglet par épreuve, numéroté en chiffres
// romains. Fait : sinople ; en cours : or ; à venir : vélin.
export function chiffreRomain(n: number): string {
  const table: [number, string][] = [
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let r = "";
  for (const [v, s] of table) {
    while (n >= v) {
      r += s;
      n -= v;
    }
  }
  return r;
}

export function Feuillets({
  total,
  courant,
  className = "",
}: {
  total: number;
  courant: number;
  className?: string;
}) {
  return (
    <ol
      className={`flex flex-1 items-center gap-2 ${className}`}
      aria-label={`Feuillet ${courant + 1} sur ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <li
          key={i}
          aria-hidden="true"
          className={`flex-1 h-9 flex items-center justify-center rounded-md border-2 border-sable font-cinzel font-bold text-base ${
            i < courant
              ? "bg-sinople text-white anim-tampon"
              : i === courant
                ? "bg-or text-sable shadow-enchere anim-onglet"
                : "bg-parchemin text-sable/50"
          }`}
        >
          {chiffreRomain(i + 1)}
        </li>
      ))}
    </ol>
  );
}

export function Sceau({ className = "" }: { className?: string }) {
  // (ajouter anim-sceau à className pour qu'il s'abatte à l'apparition)
  // Sceau de cire de gueules frappé du I d'Interter : la quête est scellée
  const bords = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    return `${(40 + Math.cos(a) * 34).toFixed(1)},${(40 + Math.sin(a) * 34).toFixed(1)}`;
  });
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden="true">
      {bords.map((p, i) => {
        const [x, y] = p.split(",");
        return <circle key={i} cx={x} cy={y} r="7" fill="#c8102e" />;
      })}
      <circle cx="40" cy="40" r="34" fill="#c8102e" stroke="#2b2118" strokeWidth="1.5" />
      <circle cx="40" cy="40" r="25" fill="none" stroke="#2b2118" strokeWidth="1.2" opacity="0.35" />
      <circle cx="40" cy="40" r="22" fill="none" stroke="#e8b33d" strokeWidth="1" opacity="0.6" />
      <text
        x="40"
        y="51"
        textAnchor="middle"
        fontFamily="var(--cinzel-font), serif"
        fontWeight="900"
        fontSize="30"
        fill="#e8b33d"
      >
        I
      </text>
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
