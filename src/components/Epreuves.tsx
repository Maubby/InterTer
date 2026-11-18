"use client";

// Les épreuves d'Interter, partagées par la Quête du Jour et les duels :
// l'hôte (personnage de la guilde), la correction et les formats de mini-jeux.
// Chaque épreuve se joue comme une scène de parcours GeoGaming : le personnage
// parle, on joue, et une réussite rapporte l'objet qu'il confie.

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Bouton } from "@/components/Bouton";
import { Choix, LETTRES, type VerdictReponse } from "@/components/Jeu";
import type { Hote } from "@/lib/guilde";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { versCarte, versCoordonnees } from "@/lib/projection";

// ---------- Types ----------
export type GameType =
  "qcm" | "true_false" | "riddle" | "emoji_riddle" | "intruder" | "order_dates" | "carte";
export type Item = {
  id: string;
  game_type: GameType;
  theme?: string | null;
  payload: any;
};

// Réponse telle qu'envoyée au serveur en fin de partie (essai 2 = demi-points)
export type ReponseEnvoyee = { item_id: string; answer: any; essai?: 2 };

// Correction d'une épreuve, partagée par la Quête et le duel. Le serveur dit
// si la réponse est juste (check_practice_item) ; un QCM raté au premier essai
// laisse un second essai, à demi-points. Un joker 50/50 par partie.
export function useCorrection(supabase: SupabaseClient) {
  const [verdict, setVerdict] = useState<VerdictReponse>(null);
  const [rate, setRate] = useState<number | null>(null); // choix raté au 1er essai
  const [eliminees, setEliminees] = useState<number[]>([]); // retirées par le joker
  const [jokerPris, setJokerPris] = useState(false);
  const [enCours, setEnCours] = useState(false);

  // Renvoie la réponse à envoyer en fin de partie, ou null s'il reste un essai
  async function noter(item: Item, answer: any): Promise<{ envoi: ReponseEnvoyee; juste: boolean } | null> {
    setEnCours(true);
    const { data } = await supabase.rpc("check_practice_item", { p_item_id: item.id, p_answer: answer });
    setEnCours(false);
    const juste = (data as { is_correct?: boolean } | null)?.is_correct === true;
    const secondEssai = rate !== null;
    if (!juste && !secondEssai && item.game_type === "qcm") {
      setRate(answer.choice);
      return null;
    }
    setVerdict(juste);
    return { envoi: { item_id: item.id, answer, ...(secondEssai ? { essai: 2 as const } : {}) }, juste };
  }

  async function joker(item: Item) {
    if (jokerPris) return;
    setJokerPris(true);
    const { data } = await supabase.rpc("joker_qcm", { p_item_id: item.id });
    setEliminees((data as number[]) ?? []);
  }

  function suivante() {
    setVerdict(null);
    setRate(null);
    setEliminees([]);
  }

  return {
    verdict,
    rate,
    eliminees,
    enCours,
    jokerDispo: !jokerPris,
    points: rate !== null ? 5 : 10,
    noter,
    joker,
    suivante,
  };
}

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
      {/* Il parle dans une bulle, comme les personnages des parcours */}
      <div className="bulle">
        <p className="font-cinzel font-bold text-lg text-azur">{hote.nom}</p>
        <p className="text-base">{hote.intro}</p>
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
  rate = null,
  eliminees = [],
  onJoker,
}: {
  item: Item;
  onValider: OnValider;
  desactive: boolean;
  verdict: VerdictReponse;
  rate?: number | null;
  eliminees?: number[];
  onJoker?: () => void;
}) {
  const props = { p: item.payload, onValider, desactive, verdict, rate, eliminees, onJoker };
  return (
    <>
      {item.game_type === "qcm" && <Qcm {...props} />}
      {item.game_type === "true_false" && <VraiFaux {...props} />}
      {item.game_type === "riddle" && <Devinette {...props} />}
      {item.game_type === "emoji_riddle" && <EmojiRiddle {...props} />}
      {item.game_type === "intruder" && <Intrus {...props} />}
      {item.game_type === "order_dates" && <OrdreDates {...props} />}
      {item.game_type === "carte" && <CarteFrance {...props} />}
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
  rate?: number | null;
  eliminees?: number[];
  onJoker?: () => void;
};

// QCM à deux essais, comme dans les parcours : un raté laisse un second essai
// (à demi-points), et un joker 50/50 par partie retire deux mauvaises réponses.
function Qcm({ p, onValider, desactive, verdict = null, rate = null, eliminees = [], onJoker }: Props) {
  const [choix, setChoix] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      <p className="text-xl font-bold font-cinzel">{p.question}</p>
      {p.image && (
        <figure className="flex flex-col items-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt="" className="max-h-56 w-auto rounded-lg border-4 border-sable bg-parchemin-2 p-2" />
          {/* Les images de Wikimedia Commons demandent de citer l'auteur et la licence */}
          {p.credit && <figcaption className="text-xs text-sable/70">{p.credit}</figcaption>}
        </figure>
      )}
      {rate !== null && verdict === null && (
        <p className="font-bold text-gueules" role="status">
          Raté ! Encore un essai, pour 5 points.
        </p>
      )}
      {p.choices?.map((c: string, i: number) =>
        eliminees.includes(i) ? null : (
          <Choix
            key={i}
            lettre={LETTRES[i]}
            rang={i}
            choisi={i === rate || choix === i}
            verdict={i === rate ? false : verdict}
            desactive={desactive || i === rate}
            onClick={() => {
              setChoix(i);
              onValider({ choice: i });
            }}
          >
            {c}
          </Choix>
        )
      )}
      {onJoker && verdict === null && eliminees.length === 0 && (p.choices?.length ?? 0) > 2 && (
        <Bouton variante="secondaire" pleineLargeur disabled={desactive} onClick={onJoker}>
          Joker 50/50 (un seul par partie)
        </Bouton>
      )}
    </div>
  );
}

// Vrai ou faux en glissant la carte : à droite si c'est vrai, à gauche si
// c'est faux. Les boutons restent, pour qui préfère toucher.
function VraiFaux({ p, onValider, desactive, verdict = null }: Props) {
  const [choix, setChoix] = useState<string | null>(null);
  const [dx, setDx] = useState(0);
  const [glisse, setGlisse] = useState(false);
  const depart = useRef<number | null>(null);
  // L'affirmation : selon le format de l'item (statement, question,
  // ou 1re d'une liste "statements")
  const affirmation =
    p.statement ??
    p.question ??
    (Array.isArray(p.statements) ? p.statements[0] : null);
  const bloque = desactive || choix !== null;

  function choisir(val: string) {
    if (bloque) return;
    setChoix(val);
    onValider({ value: val });
  }

  return (
    <div className="space-y-3">
      <div
        className={`carte-swipe ${glisse ? "glisse" : ""}`}
        style={{
          transform: `translateX(${dx}px) rotate(${dx / 18}deg)`,
          borderColor: verdict === null ? undefined : verdict ? "var(--color-sinople)" : "var(--color-gueules)",
        }}
        onPointerDown={(e) => {
          if (bloque) return;
          depart.current = e.clientX;
          setGlisse(true);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (depart.current !== null) setDx(e.clientX - depart.current);
        }}
        onPointerUp={() => {
          if (depart.current === null) return;
          depart.current = null;
          setGlisse(false);
          if (Math.abs(dx) > 90) choisir(dx > 0 ? "true" : "false");
          setDx(0);
        }}
        onPointerCancel={() => {
          depart.current = null;
          setGlisse(false);
          setDx(0);
        }}
      >
        <span className="tampon-faux" style={{ opacity: Math.min(1, -dx / 90) }} aria-hidden="true">
          FAUX
        </span>
        <span className="tampon-vrai" style={{ opacity: Math.min(1, dx / 90) }} aria-hidden="true">
          VRAI
        </span>
        <p className="text-xl font-bold font-cinzel">{affichage(affirmation)}</p>
        {!bloque && (
          <p className="note-ancienne text-sm text-sable/70 mt-3">
            Glisse la carte : à droite si c&apos;est vrai, à gauche si c&apos;est faux
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          ["false", "FAUX"],
          ["true", "VRAI"],
        ].map(([val, label], i) => (
          <Choix
            key={val}
            lettre={label[0]}
            rang={i}
            choisi={choix === val}
            verdict={verdict}
            desactive={bloque}
            onClick={() => choisir(val)}
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

// La chronologie express : les événements arrivent un par un, et on place
// chacun sur la frise du temps, le plus ancien en haut. Le premier est posé
// d'office ; la frise complète part au serveur.
function OrdreDates({ p, onValider, desactive }: Props) {
  const evenements: string[] = p.events ?? [];
  // Ordre d'arrivée mélangé mais fixe (le même pour tous les joueurs)
  const arrivee = evenements
    .map((_, i) => i)
    .sort((a, b) => empreinte(evenements[a]) - empreinte(evenements[b]));
  const [frise, setFrise] = useState<number[]>(arrivee.slice(0, 1));
  const aPlacer = arrivee.find((i) => !frise.includes(i));

  function poser(position: number) {
    if (aPlacer === undefined || desactive) return;
    const nouvelle = [...frise];
    nouvelle.splice(position, 0, aPlacer);
    setFrise(nouvelle);
    if (nouvelle.length === evenements.length) onValider({ order: nouvelle });
  }

  const emplacement = (position: number) =>
    aPlacer !== undefined && !desactive ? (
      <li key={`ici-${position}`}>
        <button className="emplacement-frise" onClick={() => poser(position)}>
          Placer ici
        </button>
      </li>
    ) : null;

  return (
    <div className="space-y-3">
      <p className="text-xl font-bold font-cinzel">Place chaque événement sur la frise du temps :</p>
      {aPlacer !== undefined && (
        <div className="carte-swipe anim-reverence" key={aPlacer}>
          <p className="note-ancienne text-sm text-sable/70">
            À placer ({frise.length + 1} sur {evenements.length})
          </p>
          <p className="text-lg font-bold">{evenements[aPlacer]}</p>
        </div>
      )}
      <ol className="frise space-y-2">
        <li className="note-ancienne text-sm text-sable/70">Le plus ancien</li>
        {emplacement(0)}
        {frise.flatMap((i, pos) => [
          <li key={i} className="evenement-frise">
            {evenements[i]}
          </li>,
          emplacement(pos + 1),
        ])}
        <li className="note-ancienne text-sm text-sable/70">Le plus récent</li>
      </ol>
      {aPlacer !== undefined && frise.length > 1 && !desactive && (
        <button className="underline font-bold" onClick={() => setFrise(arrivee.slice(0, 1))}>
          Recommencer la frise
        </button>
      )}
    </div>
  );
}

// Petite empreinte d'un texte, pour mélanger sans hasard
// Placer sur la carte de France : on pose une épingle, on la déplace à
// volonté, puis on valide. Le serveur mesure l'écart (ville) ou cherche la
// région touchée. Après coup, la vraie position d'une ville s'affiche.
function CarteFrance({ p, onValider, desactive, verdict = null }: Props) {
  const [epingle, setEpingle] = useState<{ fx: number; fy: number } | null>(null);
  const [vraie, setVraie] = useState<{ fx: number; fy: number } | null>(null);

  useEffect(() => {
    if (verdict === null || p.cible !== "ville" || !p.ville) return;
    getSupabaseBrowserClient()
      .from("cities")
      .select("latitude, longitude")
      .eq("name", p.ville)
      .order("population", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) setVraie(versCarte(data[0].latitude, data[0].longitude));
      });
  }, [verdict, p.cible, p.ville]);

  function poser(e: React.MouseEvent<HTMLDivElement>) {
    if (desactive || verdict !== null) return;
    const r = e.currentTarget.getBoundingClientRect();
    setEpingle({ fx: (e.clientX - r.left) / r.width, fy: (e.clientY - r.top) / r.height });
  }

  const point = (pos: { fx: number; fy: number }, couleur: string, titre: string) => (
    <span
      title={titre}
      className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-4 border-sable pointer-events-none anim-sceau"
      style={{ left: `${pos.fx * 100}%`, top: `${pos.fy * 100}%`, background: couleur }}
    />
  );

  return (
    <div className="space-y-3">
      <p className="text-xl font-bold font-cinzel">{p.question}</p>
      <div
        onClick={poser}
        className="relative w-full border-4 border-sable rounded-lg bg-[#cfe3f2] cursor-crosshair select-none"
        role="application"
        aria-label="Carte de France : touche l'endroit de ta réponse"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/carte/france.svg" alt="" className="w-full block" draggable={false} />
        {epingle && point(epingle, verdict === false ? "#b3261e" : "#c9a227", "Ta réponse")}
        {vraie && verdict === false && point(vraie, "#2e7d32", p.ville)}
      </div>
      {vraie && verdict === false && (
        <p className="font-bold">
          <span className="text-gueules">●</span> ta réponse,{" "}
          <span className="text-sinople">●</span> {p.ville}
        </p>
      )}
      {verdict === null && (
        <Bouton
          variante="enigme"
          pleineLargeur
          disabled={desactive || !epingle}
          onClick={() => epingle && onValider(versCoordonnees(epingle.fx, epingle.fy))}
        >
          {epingle ? "Je pose mon épingle ici" : "Touche la carte"}
        </Bouton>
      )}
    </div>
  );
}

function empreinte(texte: string): number {
  let h = 7;
  for (const c of texte) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}
