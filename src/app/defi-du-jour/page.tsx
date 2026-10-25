"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Bouton } from "@/components/Bouton";
import { Carte, Titre } from "@/components/Carte";
import Image from "next/image";
import { Separateur, RoseDesVents } from "@/components/Fioritures";
import { Etoile, Flamme, Trophee } from "@/components/Icons";

// ---------- La guilde d'Interter : un personnage par thème ----------
// Les thèmes structurent la banque de questions ; les formats
// (qcm, devinette...) sont la manière de jouer chaque thème.
const GUILDE: Record<string, { nom: string; svg: string; intro: string }> = {
  qcm: {
    nom: "Mahaut la Marchande",
    svg: "/personnages/mahaut-marchande.svg",
    intro: "Mahaut étale ses marchandises devant toi :",
  },
  true_false: {
    nom: "Henri le Bailli",
    svg: "/personnages/etienne-greffier.svg",
    intro: "Henri te demande de trancher :",
  },
  riddle: {
    nom: "Ameline la Conteuse",
    svg: "/personnages/ameline-contreuse.svg",
    intro: "Ameline conte une légende, devine la fin :",
  },
  emoji_riddle: {
    nom: "Garin le Forgeron",
    svg: "/personnages/garin-forgeron.svg",
    intro: "Garin frappe son enclume, écoute bien :",
  },
  intruder: {
    nom: "Yvonne la Marmitonne",
    svg: "/personnages/yvonne-marmitonne.svg",
    intro: "Yvonne vide son panier sur la table :",
  },
  order_dates: {
    nom: "Frère Anselme",
    svg: "/personnages/anselme-moine.svg",
    intro: "Frère Anselme ouvre sa chronique :",
  },
};

// ---------- Types ----------
type GameType =
  | "qcm" | "true_false" | "riddle" | "emoji_riddle" | "intruder" | "order_dates";
type Item = { id: string; game_type: GameType; payload: any };
type Resultat = { score: number; total: number; correct_count: number; streak: number };

export default function PageDefiDuJour() {
  const supabase = getSupabaseBrowserClient();

  const [phase, setPhase] = useState<
    "chargement" | "connecte-toi" | "pas-encore" | "accueil" | "question" | "resultat"
  >("chargement");
  const [items, setItems] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const [reponses, setReponses] = useState<{ item_id: string; answer: any }[]>([]);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [reponseDonnee, setReponseDonnee] = useState(false);
  const [bonneReponse, setBonneReponse] = useState<boolean | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  // Au chargement : connecté ? ville choisie ?
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPhase("connecte-toi");
        return;
      }
      const { data: profil } = await supabase
        .from("profiles")
        .select("city_id")
        .eq("id", user.id)
        .single();
      if (!profil?.city_id) {
        setPhase("pas-encore");
        return;
      }
      setPhase("accueil");
    })();
  }, []);

  // Démarrage : charge les items du défi publié aujourd'hui
  async function demarrer() {
    setEnCours(true);
    setErreur(null);
    const { data, error } = await supabase
      .from("daily_challenges")
      .select("item_ids")
      .eq("challenge_date", new Date().toISOString().slice(0, 10))
      .eq("is_published", true)
      .single();
    if (error || !data) {
      setErreur("La Quête du Jour n'est pas encore publiée — reviens plus tard !");
      setEnCours(false);
      return;
    }
    const { data: itemsData } = await supabase
      .from("game_items_public")
      .select("id, game_type, payload")
      .in("id", data.item_ids);
    if (!itemsData) {
      setErreur("Impossible de charger les mini-jeux du jour.");
      setEnCours(false);
      return;
    }
    // Conserver l'ordre du défi
    const ordres: Item[] = data.item_ids
      .map((id: string) => itemsData.find((i: any) => i.id === id))
      .filter(Boolean);
    setItems(ordres);
    setIndex(0);
    setReponses([]);
    setPhase("question");
    setEnCours(false);
  }

  // Feedback d'une réponse : validée par la RPC check_practice_item
  // (rapide, fiable, sans enjeu — le score réel tombe à la fin).
  async function noterReponse(answer: any) {
    if (reponseDonnee || enCours) return;
    setEnCours(true);
    const { data } = await supabase.rpc("check_practice_item", {
      p_item_id: items[index].id,
      p_answer: answer,
    });
    const ok = (data as any)?.is_correct === true;
    setBonneReponse(ok);
    setReponseDonnee(true);
    setReponses((r) => [...r, { item_id: items[index].id, answer }]);
    setEnCours(false);
  }

  // Question suivante — ou envoi au serveur (RPC anti-triche) à la fin
  async function suivant() {
    if (index + 1 < items.length) {
      setIndex((i) => i + 1);
      setReponseDonnee(false);
      setBonneReponse(null);
      return;
    }
    setEnCours(true);
    const { data, error } = await supabase.rpc("play_daily_challenge", {
      p_answers: reponses,
    });
    setEnCours(false);
    if (error) {
      setErreur(error.message);
      return;
    }
    setResultat(data as Resultat);
    setPhase("resultat");
  }

  // ---------- Écran : pas connecté ----------
  if (phase === "connecte-toi") {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 space-y-6 text-center">
        <Titre>La Quête du Jour</Titre>
        <Carte className="space-y-4">
          <p className="text-lg">
            La Quête du Jour, c&apos;est <strong>5 mini-jeux identiques pour
            toute la France</strong>, à jouer une seule fois. Tes points
            comptent <strong>double</strong> pour ta ville !
          </p>
          <Bouton
            variante="primaire"
            pleineLargeur
            onClick={() => (window.location.href = "/connexion")}
          >
            <Etoile className="w-6 h-6" /> Connecte-toi pour jouer
          </Bouton>
        </Carte>
      </main>
    );
  }

  // ---------- Écran : ville non choisie ----------
  if (phase === "pas-encore") {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 space-y-6 text-center">
        <Titre>La Quête du Jour</Titre>
        <Carte className="space-y-4">
          <p className="text-lg">
            Choisis d&apos;abord ta ville : sans elle, tes points ne savent
            pas où aller !
          </p>
          <Bouton
            variante="primaire"
            pleineLargeur
            onClick={() => (window.location.href = "/choisir-ma-ville")}
          >
            Choisir ma ville
          </Bouton>
        </Carte>
      </main>
    );
  }

  // ---------- Écran : résultat ----------
  if (phase === "resultat" && resultat) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 space-y-6 text-center">
        <Titre>Ta Quête du Jour est accomplie !</Titre>
        <Carte className="space-y-4">
          <Trophee taille={64} className="mx-auto text-or" />
          <p className="text-2xl font-bold">
            {resultat.correct_count}/{resultat.total / 10} bonnes réponses
          </p>
          <p className="text-xl">
            <strong>{resultat.score} points</strong> pour ta ville — soit{" "}
            <strong className="text-sinople">{resultat.score * 2} points</strong>{" "}
            comptés au classement (×2 Quête du Jour) !
          </p>
          <p className="flex items-center justify-center gap-2 text-lg">
            <Flamme className="w-6 h-6 text-gueules" />
            Série : <strong>{resultat.streak} jour{resultat.streak > 1 ? "s" : ""}</strong>
          </p>
          <p className="text-base text-sable/70">
            Reviens demain pour un nouveau défi — et fais grandir ta série !
          </p>
          <Bouton
            variante="secondaire"
            pleineLargeur
            onClick={() => (window.location.href = "/")}
          >
            Retour à l&apos;accueil
          </Bouton>
        </Carte>
      </main>
    );
  }

  // ---------- Écran : question ----------
  if (phase === "question" && items[index]) {
    const item = items[index];
    return (
      <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
        {/* Barre de progression */}
        <div className="flex items-center gap-2">
          {items.map((_, i) => (
            <div
              key={i}
              className={`h-3 flex-1 rounded-full border-2 border-sable ${
                i < index ? "bg-sinople" : i === index ? "bg-or" : "bg-parchemin-2"
              }`}
            />
          ))}
        </div>

        <Titre niveau={2}>
          {GUILDE[items[index].game_type]?.nom ?? "Épreuve"} — {index + 1} sur {items.length}
        </Titre>

        <Carte
          className={`space-y-4 ${
            reponseDonnee
              ? bonneReponse
                ? "anim-tampon border-sinople"
                : "anim-tremble border-gueules"
              : ""
          }`}
        >
          {/* L'hôte de l'épreuve */}
          {GUILDE[items[index].game_type] && (
            <div className="flex items-center gap-3 border-b-2 border-sable/20 pb-3">
              <Image
                src={GUILDE[items[index].game_type].svg}
                alt={GUILDE[items[index].game_type].nom}
                width={56}
                height={56}
                unoptimized
              />
              <div>
                <p className="font-cinzel font-bold text-lg text-azur">
                  {GUILDE[items[index].game_type].nom}
                </p>
                <p className="text-base text-sable/70">
                  {GUILDE[items[index].game_type].intro}
                </p>
              </div>
            </div>
          )}
          {item.game_type === "qcm" && <Qcm p={item.payload} onValider={noterReponse} desactive={reponseDonnee || enCours} />}
          {item.game_type === "true_false" && <VraiFaux p={item.payload} onValider={noterReponse} desactive={reponseDonnee || enCours} />}
          {item.game_type === "riddle" && <Devinette p={item.payload} onValider={noterReponse} desactive={reponseDonnee || enCours} />}
          {item.game_type === "emoji_riddle" && <EmojiRiddle p={item.payload} onValider={noterReponse} desactive={reponseDonnee || enCours} />}
          {item.game_type === "intruder" && <Intrus p={item.payload} onValider={noterReponse} desactive={reponseDonnee || enCours} />}
          {item.game_type === "order_dates" && <OrdreDates p={item.payload} onValider={noterReponse} desactive={reponseDonnee || enCours} />}

          {reponseDonnee && (
            <>
              <div
                className={`text-center font-bold text-xl ${
                  bonneReponse ? "text-sinople" : "text-gueules"
                }`}
              >
                {bonneReponse ? "Bravo ! " : "Dommage !"}
              </div>
              {item.payload?.explanation && (
                <div className="text-base bg-parchemin rounded-lg border-2 border-sable/30 p-3">
                  <strong className="font-cinzel">Selon la Chronique…</strong> {item.payload.explanation}
                </div>
              )}
              <Bouton variante="primaire" pleineLargeur onClick={suivant} disabled={enCours}>
                {index + 1 >= items.length ? "Envoyer mes réponses !" : "Mini-jeu suivant"}
              </Bouton>
            </>
          )}
        </Carte>
      </main>
    );
  }

  // ---------- Écran d'accueil du défi ----------
  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6 text-center">
      <Titre>La Quête du Jour</Titre>
      <Carte className="space-y-4">
        <p className="text-lg">
          <strong>5 mini-jeux identiques pour toute la France</strong>, à
          jouer <strong>une seule fois</strong> par jour.
        </p>
        <p className="text-base">
          Tes points comptent <strong>double</strong> pour ta ville. Chaque
          jour joué augmente ta série{" "}
          <Flamme className="inline w-5 h-5 text-gueules" /> !
        </p>
        <Separateur />
        {erreur && <p className="text-gueules font-bold">{erreur}</p>}
        {phase === "chargement" ? (
          <p>Chargement…</p>
        ) : (
          <Bouton variante="succes" pleineLargeur onClick={demarrer} disabled={enCours}>
            {enCours ? "Préparation…" : "C'est parti !"}
          </Bouton>
        )}
      </Carte>
    </main>
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
type Props = { p: any; onValider: OnValider; desactive: boolean };

function Qcm({ p, onValider, desactive }: Props) {
  const [choix, setChoix] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      <p className="text-xl font-bold">{p.question}</p>
      {p.choices?.map((c: string, i: number) => (
        <button
          key={i}
          disabled={desactive}
          onClick={() => { setChoix(i); onValider({ choice: i }); }}
          className={`w-full min-h-[56px] rounded-lg border-4 text-lg font-bold ${
            choix === i ? "bg-or border-sable" : "bg-white border-sable hover:bg-or/20"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

function VraiFaux({ p, onValider, desactive }: Props) {
  const [choix, setChoix] = useState<string | null>(null);
  // L'affirmation : selon le format de l'item (statement, question,
  // ou 1re d'une liste "statements")
  const affirmation = p.statement ?? p.question ?? (Array.isArray(p.statements) ? p.statements[0] : null);
  // La bonne réponse au même format
  const bonne = p.answer ?? (Array.isArray(p.answers) ? p.answers[0] : null);
  return (
    <div className="space-y-3">
      <p className="text-xl font-bold">{affichage(affirmation)}</p>
      <div className="grid grid-cols-2 gap-3">
        {[["true", "VRAI"], ["false", "FAUX"]].map(([val, label]) => (
          <button
            key={val}
            disabled={desactive}
            onClick={() => { setChoix(val); onValider({ value: val }); }}
            className={`min-h-[64px] rounded-lg border-4 text-xl font-bold ${
              choix === val ? "bg-or border-sable" : "bg-white border-sable hover:bg-or/20"
            }`}
          >
            {label}
          </button>
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
      <p className="text-lg font-bold text-center">Quelle ville se cache derrière ces emojis ?</p>
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

function Intrus({ p, onValider, desactive }: Props) {
  const [choix, setChoix] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      <p className="text-xl font-bold">Trouve l&apos;intrus :</p>
      <div className="grid grid-cols-2 gap-3">
        {p.items?.map((c: string, i: number) => (
          <button
            key={i}
            disabled={desactive}
            onClick={() => { setChoix(i); onValider({ intruder_index: i }); }}
            className={`min-h-[64px] rounded-lg border-4 text-lg font-bold ${
              choix === i ? "bg-or border-sable" : "bg-white border-sable hover:bg-or/20"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

function OrdreDates({ p, onValider, desactive }: Props) {
  const [ordre, setOrdre] = useState<number[]>([]);
  const tous = Array.from({ length: p.events?.length ?? 0 }, (_, i) => i);

  function basculer(i: number) {
    if (ordre.includes(i)) setOrdre(ordre.filter((x) => x !== i));
    else setOrdre([...ordre, i]);
  }

  return (
    <div className="space-y-3">
      <p className="text-xl font-bold">Classe du plus ancien au plus récent :</p>
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
              ordre.includes(i) ? "bg-or border-sable" : "bg-white border-sable hover:bg-or/20"
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
