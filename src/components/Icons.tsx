// Icônes SVG maison aux couleurs de la palette — zéro emoji dans l'UI.
type IconProps = { taille?: number; className?: string };

const base = (taille: number) => ({
  width: taille,
  height: taille,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export function Bouclier({ taille = 24, className }: IconProps) {
  return (
    <svg {...base(taille)} className={className}>
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" />
    </svg>
  );
}

export function Trophee({ taille = 24, className }: IconProps) {
  return (
    <svg {...base(taille)} className={className}>
      <path d="M8 4h8v5a4 4 0 01-8 0z" />
      <path d="M8 5H5a3 3 0 003 4M16 5h3a3 3 0 01-3 4" />
      <path d="M12 13v4M9 21h6M10 17h4l1 4H9z" />
    </svg>
  );
}

export function Sablier({ taille = 24, className }: IconProps) {
  return (
    <svg {...base(taille)} className={className}>
      <path d="M7 3h10M7 21h10M8 3c0 4 3 5 4 6 1-1 4-2 4-6M8 21c0-4 3-5 4-6 1 1 4 2 4 6" />
    </svg>
  );
}

export function Eclair({ taille = 24, className }: IconProps) {
  return (
    <svg {...base(taille)} className={className}>
      <path d="M13 2L5 13h6l-2 9 8-11h-6z" />
    </svg>
  );
}

export function Flamme({ taille = 24, className }: IconProps) {
  return (
    <svg {...base(taille)} className={className}>
      <path d="M12 2c1 4-4 6-4 10a4 4 0 008 0c0-2-1-3-1-3s3 1 3 5a6 6 0 01-12 0c0-6 5-8 6-12z" />
    </svg>
  );
}

export function Etoile({ taille = 24, className }: IconProps) {
  return (
    <svg {...base(taille)} className={className}>
      <path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z" />
    </svg>
  );
}

export function Ampoule({ taille = 24, className }: IconProps) {
  return (
    <svg {...base(taille)} className={className}>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.8.7 1 1.5 1 2.5h6c0-1 .2-1.8 1-2.5A6 6 0 0012 3z" />
    </svg>
  );
}
