// Carte parchemin secondaire : fond parchemin-2, bord noir épais, ombre franche.
export function Carte({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`bg-parchemin-2 border-4 border-sable rounded-xl shadow-enchere p-5 ${className}`}
    >
      {children}
    </div>
  );
}

// Titre gravé Cinzel, jamais d'ombre sur le texte.
export function Titre({
  niveau = 1,
  className = "",
  children,
}: {
  niveau?: 1 | 2 | 3;
  className?: string;
  children: React.ReactNode;
}) {
  const Tag = niveau === 1 ? "h1" : niveau === 2 ? "h2" : "h3";
  const taille =
    niveau === 1 ? "text-3xl md:text-4xl" : niveau === 2 ? "text-2xl" : "text-xl";
  return (
    <Tag className={`font-cinzel font-bold text-sable ${taille} ${className}`}>
      {children}
    </Tag>
  );
}
