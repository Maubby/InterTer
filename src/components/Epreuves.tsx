"use client";

// Les épreuves d'Interter, partagées par la Quête du Jour et les duels :
// l'hôte (personnage de la guilde) et les formats de mini-jeux.

import { useEffect, useState } from "react";
import Image from "next/image";
import { Bouton } from "@/components/Bouton";
import { Choix, LETTRES, type VerdictReponse } from "@/components/Jeu";
import type { Hote } from "@/lib/guilde";

// ---------- Types ----------
export type GameType =
  "qcm" | "true_false" | "riddle" | "emoji_riddle" | "intruder" | "order_dates";
export type Item = {
  id: string;
  game_type: GameType;
  theme?: string | null;
  payload: any;
};

// L'hôte de l'épreuve : il fait sa révérence en arrivant, puis son portrait
// suit la réponse (il se réjouit ou se désole avec le joueur).
export function HoteEpreuve({
  hote,
  reponseDonnee,
  bonneReponse,
}: {
  hote?: Hote;
  reponseDonnee: boolean;
  bonneReponse: boolean | null;
}) {
  if (!hote) return null;
  const portrait = hote.portraits
    ? reponseDonnee
      ? bonneReponse
        ? hote.portraits.bravo
        : hote.portraits.oups
      : hote.portraits.question
    : null;
  return (
    <div className="anim-reverence flex items-center gap-3 border-b-2 border-sable/20 pb-3">
      {portrait ? (
        <Image
          src={portrait}
          alt={hote.nom}
          width={96}
          height={96}
          unoptimized
          className={`shrink-0 rounded-full border-4 border-or outline-2 outline-sable bg-parchemin-2 ${
            reponseDonnee ? (bonneReponse ? "anim-saut" : "anim-desole") : ""
          }`}
        />
      ) : (
        <Image
          src={hote.svg!}
          alt={hote.nom}
          width={56}
          height={56}
          unoptimized
        />
      )}
      <div>
        <p className="font-cinzel font-bold text-lg text-azur">{hote.nom}</p>
        <p className="note-ancienne text-base text-sable/80">{hote.intro}</p>
      </div>
    </div>
  );
}

// Aiguillage vers le bon format de mini-jeu
export function Epreuve({
  item,
  onValider,
  desactive,
  verdict,
}: {
  item: Item;
  onValider: OnValider;
  desactive: boolean;
  verdict: VerdictReponse;
}) {
  const props = { p: item.payload, onValider, desactive, verdict };
  return (
    <>
      {item.game_type === "qcm" && <Qcm {...props} />}
      {item.game_type === "true_false" && <VraiFaux {...props} />}
      {item.game_type === "riddle" && <Devinette {...props} />}
      {item.game_type === "emoji_riddle" && <EmojiRiddle {...props} />}
      {item.game_type === "intruder" && <Intrus {...props} />}
      {item.game_type === "order_dates" && <OrdreDates {...props} />}
    </>
  );
}

// ============================================================
// Formats — envoient la réponse au parent, qui valide via RPC.
// ============================================================

// Affiche une affirmation booléenne proprement (true → Vrai)
function affichage(a: any): string {
  if (a === true) return "Vrai";
  if (a === false) return "Faux";
  return String(a ?? "");
}

type OnValider = (answer: any) => void;
type Props = {
  p: any;
  onValider: OnValider;
  desactive: boolean;
  verdict?: VerdictReponse;
};

function Qcm({ p, onValider, desactive, verdict = null }: Props) {
  const [choix, setChoix] = useState<number | null>(null);
  // Reset quand on change d'épreuve (sinon le choix précédent reste surligné)
  useEffect(() => {
    setChoix(null);
  }, [p]);
  return (
    <div className="space-y-3">
      <p className="text-xl font-bold font-cinzel">{p.question}</p>
      {p.choices?.map((c: string, i: number) => (
        <Choix
          key={i}
          lettre={LETTRES[i]}
          rang={i}
          choisi={choix === i}
          verdict={verdict}
          desactive={desactive}
          onClick={() => {
            setChoix(i);
            onValider({ choice: i });
          }}
        >
          {c}
        </Choix>
      ))}
    </div>
  );
}

function VraiFaux({ p, onValider, desactive, verdict = null }: Props) {
  const [choix, setChoix] = useState<string | null>(null);
  // Reset quand on change d'épreuve
  useEffect(() => {
    setChoix(null);
  }, [p]);
  // L'affirmation : selon le format de l'item (statement, question,
  // ou 1re d'une liste "statements")
  const affirmation =
    p.statement ??
    p.question ??
    (Array.isArray(p.statements) ? p.statements[0] : null);
  // La bonne réponse au même format
  const bonne = p.answer ?? (Array.isArray(p.answers) ? p.answers[0] : null);
  return (
    <div className="space-y-3">
      <p className="text-xl font-bold font-cinzel">{affichage(affirmation)}</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          ["true", "VRAI"],
          ["false", "FAUX"],
        ].map(([val, label], i) => (
          <Choix
            key={val}
            lettre={label[0]}
            rang={i}
            choisi={choix === val}
            verdict={verdict}
            desactive={desactive}
            onClick={() => {
              setChoix(val);
              onValider({ value: val });
            }}
          >
            {label}
          </Choix>
        ))}
      </div>
    </div>
  );
}

function Devinette({ p, onValider, desactive }: Props) {
  const [texte, setTexte] = useState("");
  return (
    <div className="space-y-3">
      <p className="text-xl font-bold">{p.riddle}</p>
      <input
        type="text"
        disabled={desactive}
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        placeholder="Ta réponse…"
        className="w-full min-h-[56px] px-4 rounded-lg border-4 border-sable bg-parchemin-2 text-lg"
      />
      <Bouton
        variante="enigme"
        pleineLargeur
        disabled={desactive || texte.trim().length === 0}
        onClick={() => onValider({ text: texte })}
      >
        Valider ma réponse
      </Bouton>
      {p.hints && (
        <details className="text-sable/70">
          <summary className="cursor-pointer font-bold">Un indice ?</summary>
          <ul>
            {p.hints.map((h: string, i: number) => (
              <li key={i}>— {h}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function EmojiRiddle({ p, onValider, desactive }: Props) {
  const [texte, setTexte] = useState("");
  return (
    <div className="space-y-3">
      <p className="text-4xl text-center py-2">{p.emojis}</p>
      <p className="text-lg font-bold text-center">
        Quelle ville se cache derrière ces emojis ?
      </p>
      <input
        type="text"
        disabled={desactive}
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        placeholder="Le nom de la ville…"
        className="w-full min-h-[56px] px-4 rounded-lg border-4 border-sable bg-parchemin-2 text-lg"
      />
      <Bouton
        variante="enigme"
        pleineLargeur
        disabled={desactive || texte.trim().length === 0}
        onClick={() => onValider({ text: texte })}
      >
        Valider ma réponse
      </Bouton>
      {p.hints && (
        <details className="text-sable/70">
          <summary className="cursor-pointer font-bold">Un indice ?</summary>
          <ul>
            {p.hints.map((h: string, i: number) => (
              <li key={i}>— {h}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Intrus({ p, onValider, desactive, verdict = null }: Props) {
  const [choix, setChoix] = useState<number | null>(null);
  // Reset quand on change d'épreuve
  useEffect(() => {
    setChoix(null);
  }, [p]);
  return (
    <div className="space-y-3">
      <p className="text-xl font-bold">Trouve l&apos;intrus :</p>
      <div className="grid grid-cols-2 gap-3">
        {p.items?.map((c: string, i: number) => (
          <Choix
            key={i}
            lettre={LETTRES[i]}
            rang={i}
            choisi={choix === i}
            verdict={verdict}
            desactive={desactive}
            onClick={() => {
              setChoix(i);
              onValider({ intruder_index: i });
            }}
          >
            {c}
          </Choix>
        ))}
      </div>
    </div>
  );
}

function OrdreDates({ p, onValider, desactive }: Props) {
  const [ordre, setOrdre] = useState<number[]>([]);
  // Reset quand on change d'épreuve
  useEffect(() => {
    setOrdre([]);
  }, [p]);
  const tous = Array.from({ length: p.events?.length ?? 0 }, (_, i) => i);

  function basculer(i: number) {
    if (ordre.includes(i)) setOrdre(ordre.filter((x) => x !== i));
    else setOrdre([...ordre, i]);
  }

  return (
    <div className="space-y-3">
      <p className="text-xl font-bold">
        Classe du plus ancien au plus récent :
      </p>
      <ol className="space-y-2">
        {ordre.map((i, pos) => (
          <li key={i} className="font-bold text-azur">
            {pos + 1}. {p.events[i]}
          </li>
        ))}
      </ol>
      <div className="grid gap-2">
        {tous.map((i) => (
          <button
            key={i}
            disabled={desactive}
            onClick={() => basculer(i)}
            className={`min-h-[52px] rounded-lg border-4 text-lg font-bold ${
              ordre.includes(i)
                ? "bg-or border-sable"
                : "bg-white border-sable hover:bg-or/20"
            }`}
          >
            {p.events[i]}
          </button>
        ))}
      </div>
      <Bouton
        variante="enigme"
        pleineLargeur
        disabled={desactive || ordre.length !== tous.length}
        onClick={() => onValider({ order: ordre })}
      >
        Valider mon classement
      </Bouton>
    </div>
  );
}
