// Boutons officiels Interter : gros (cible senior), bord épais, ombre franche.
// Texte blanc pur sur couleur — jamais d'or sur rouge.

type Variante = "primaire" | "succes" | "enigme" | "secondaire";

const variantes: Record<Variante, string> = {
  primaire: "bg-gueules text-white",
  succes: "bg-sinople text-white",
  enigme: "bg-azur text-white",
  secondaire: "bg-parchemin-2 text-sable",
};

export function Bouton({
  variante = "primaire",
  pleineLargeur = false,
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  pleineLargeur?: boolean;
}) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        min-h-[56px] px-6 py-3
        rounded-lg text-lg font-bold
        border-4 border-sable
        shadow-enchere
        active:translate-x-[3px] active:translate-y-[3px] active:shadow-none
        transition-transform duration-75
        disabled:opacity-50 disabled:pointer-events-none
        ${variantes[variante]} ${pleineLargeur ? "w-full" : ""} ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
