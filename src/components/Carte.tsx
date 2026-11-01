// Page de manuscrit enluminé : vélin clair, bord d'encre épais, ombre franche,
// filet d'or et fleurons d'angle (classe .page-enluminee, globals.css).
export function Carte({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`page-enluminee pile-feuillets relative bg-parchemin border-4 border-sable rounded-xl p-5 ${className}`}
    >
      {children}
    </div>
  );
}

// Titre gravé Cinzel, jamais d'ombre sur le texte.
// Niveau 1 : se déroule sur une banderole de gueules liserée d'or
// (texte blanc pur sur couleur). Niveau 2 : précédé d'un pied-de-mouche ¶.
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
  // Typographie française : espace insécable avant ! ? : ; (le « ! » ne
  // tombe jamais seul à la ligne sur la banderole)
  let contenu =
    typeof children === "string" ? children.replace(/ ([!?:;])/g, " $1") : children;
  if (niveau === 1) {
    contenu = <span className="banderole">{contenu}</span>;
  } else if (niveau === 2) {
    contenu = (
      <>
        <span className="rubrique mr-2" aria-hidden="true">¶</span>
        {contenu}
      </>
    );
  }
  return (
    <Tag className={`font-cinzel font-bold text-sable ${taille} ${className}`}>
      {contenu}
    </Tag>
  );
}

// Lettrine enluminée, à placer au début d'un paragraphe dont on retire la
// première lettre : <p><Lettrine lettre="B" />ienvenue…</p>
// La lettre ornée est décorative ; les lecteurs d'écran lisent la lettre cachée.
export function Lettrine({
  lettre,
  couleur = "gueules",
}: {
  lettre: string;
  couleur?: "gueules" | "azur";
}) {
  return (
    <>
      <span
        aria-hidden="true"
        className={`lettrine ${couleur === "azur" ? "lettrine-azur" : ""}`}
      >
        {lettre}
      </span>
      <span className="sr-only">{lettre}</span>
    </>
  );
}
