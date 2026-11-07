// Éléments partagés des épreuves (Quête du Jour, essai).

import { Eclats } from "@/components/Fioritures";

// Verdict du serveur sur la réponse : null tant qu'il n'a pas répondu.
export type VerdictReponse = boolean | null;

// Une réponse en cartouche : lettrine A, B, C… et texte, en relief.
// Le serveur ne dit que si la réponse CHOISIE est juste (le navigateur ne
// connaît jamais la bonne) : la choisie passe au vert coché ou au rouge
// barré, les autres s'estompent.
export function Choix({
  lettre,
  rang,
  choisi,
  verdict,
  desactive,
  onClick,
  children,
}: {
  lettre?: string;
  rang: number;
  choisi: boolean;
  verdict: VerdictReponse;
  desactive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const etat =
    verdict === null
      ? choisi
        ? "choisi"
        : "libre"
      : choisi
        ? verdict
          ? "juste"
          : "faux"
        : "eteint";
  return (
    <button
      disabled={desactive}
      onClick={onClick}
      className={`choix choix-${etat}`}
      // Les cartouches entrent l'une après l'autre
      style={verdict === null ? { animationDelay: `${300 + rang * 80}ms` } : undefined}
    >
      {lettre && (
        <span aria-hidden="true" className={`lettre-choix ${rang % 2 ? "lettre-choix-azur" : ""}`}>
          {lettre}
        </span>
      )}
      <span className="flex-1">{children}</span>
      {etat === "juste" && (
        <svg viewBox="0 0 24 24" className="w-7 h-7 shrink-0" aria-label="Bonne réponse">
          <path d="M4 12.5 9.5 18 20 6" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {etat === "faux" && (
        <svg viewBox="0 0 24 24" className="w-7 h-7 shrink-0" aria-label="Mauvaise réponse">
          <path d="M6 6 18 18M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

// Lettres des cartouches
export const LETTRES = ["A", "B", "C", "D", "E", "F"];

// Le trésor de la partie : les objets confiés par les personnages
export function Tresor({ objets }: { objets: string[] }) {
  if (objets.length === 0) return null;
  return (
    <div className="glose text-left space-y-1">
      <p className="font-cinzel font-bold">
        <span className="rubrique" aria-hidden="true">¶ </span>
        Ton trésor : {objets.length} objet{objets.length > 1 ? "s" : ""}
      </p>
      <ul className="space-y-0.5">
        {objets.map((o, i) => (
          <li key={i}>
            <span className="text-or" aria-hidden="true">✦ </span>
            {o.charAt(0).toUpperCase() + o.slice(1)}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Le verdict se déroule sur une banderole : de sinople et en gerbe d'éclats
// pour une bonne réponse, de gueules pour une erreur. Une bonne réponse
// rapporte aussi l'objet que confie le personnage (recompense).
export function Verdict({
  juste,
  points = 10,
  recompense,
}: {
  juste: boolean;
  points?: number;
  recompense?: string;
}) {
  return (
    <div className="relative text-center space-y-3" role="status">
      {juste && (
        <>
          <Eclats className="left-1/2 top-1/2" />
          <span className="anim-fanion font-cinzel font-black text-or text-2xl">
            +{points} points !
          </span>
        </>
      )}
      <span className={`banderole font-cinzel font-bold text-2xl ${juste ? "banderole-sinople" : ""}`}>
        {juste ? "Bravo !" : "Dommage !"}
      </span>
      {juste && recompense && (
        <p className="anim-reverence font-cinzel font-bold text-lg text-sable">
          <span className="rubrique" aria-hidden="true">✦ </span>
          {recompense}
        </p>
      )}
    </div>
  );
}
