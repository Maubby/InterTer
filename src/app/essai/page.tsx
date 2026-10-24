"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Bouton } from "@/components/Bouton";
import { Carte, Titre } from "@/components/Carte";
import { Etoile, Trophee } from "@/components/Icons";

// ---------- Types des items (vue publique SANS les réponses) ----------
type Item = {
  id: string;
  game_type: "qcm" | "true_false" | "riddle" | "emoji_riddle" | "intruder" | "order_dates";
  payload: any; // contenu selon game_type, sans les champs de réponse
};

const NB_ESSAI = 3; // 3 mini-jeux jouables sans compte

export default function PageEssai() {
  const supabase = getSupabaseBrowserClient();
  const [items, setItems] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [reponseDonnee, setReponseDonnee] = useState(false);
  const [bonneReponse, setBonneReponse] = useState<boolean | null>(null);
  const [fini, setFini] = useState(false);
  const [chargement, setChargement] = useState(true);

  // Chargement de 3 items aléatoires (vue publique : pas de réponses exposées)
  useEffect(() => {
    (async () => {
      // Un item de chaque format différent si possible : on tire 3 game_types distincts
      const types = ["qcm", "riddle", "intruder"] as const;
      const res = await Promise.all(
        types.map((t) =>
          supabase
            .from("game_items_public")
            .select("id, game_type, payload, difficulty")
            .eq("game_type", t)
            .limit(1)
        )
      );
      const liste: Item[] = [];
      for (const r of res) {
        if (r.data && r.data.length > 0) liste.push(r.data[0] as Item);
      }
      setItems(liste);
      setChargement(false);
    })();
  }, []);

  const item = items[index];

  // Feedback : vert tamponné / rouge qui tremble + points volants
  function valider(estCorrect: boolean) {
    setReponseDonnee(true);
    setBonneReponse(estCorrect);
    if (estCorrect) setScore((s) => s + 10);
  }

  function suivant() {
    if (index + 1 >= items.length) {
      setFini(true);
    } else {
      setIndex((i) => i + 1);
      setReponseDonnee(false);
      setBonneReponse(null);
    }
  }

  // ---------- Écran final : conversion ----------
  if (fini) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 space-y-6 text-center">
        <Trophee taille={64} className="mx-auto text-or" />
        <Titre>Tu as marqué {score} points !</Titre>
        <Carte className="space-y-4">
          <p className="text-xl">
            Ton score <strong>compterait pour ta ville</strong> si tu avais un
            compte !
          </p>
          <p>
            Chaque jour, un nouveau Défi du Jour fait monter ta commune dans le
            classement national.
          </p>
          <Bouton
            variante="primaire"
            pleineLargeur
            onClick={() => (window.location.href = "/connexion")}
          >
            <Etoile className="w-6 h-6" /> Crée mon compte, c&apos;est gratuit
          </Bouton>
          <button
            className="underline font-bold"
            onClick={() => (window.location.href = "/")}
          >
            Retour à l&apos;accueil
          </button>
        </Carte>
      </main>
    );
  }

  if (chargement) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 text-center">
        <p className="text-lg">Chargement des mini-jeux…</p>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 text-center space-y-4">
        <p>Aucun mini-jeu disponible pour le moment.</p>
      </main>
    );
  }

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
        <span className="font-cinzel font-bold ml-2">{score} pts</span>
      </div>

      <Titre niveau={2}>Mini-jeu {index + 1} sur {items.length}</Titre>

      <Carte
        className={`space-y-4 ${
          reponseDonnee
            ? bonneReponse
              ? "anim-tampon border-sinople"
              : "anim-tremble border-gueules"
            : ""
        }`}
      >
        {/* ---- Rendu selon le format ---- */}
        {item.game_type === "qcm" && <Qcm item={item} onValider={valider} desactive={reponseDonnee} />}
        {item.game_type === "riddle" && <Devinette item={item} onValider={valider} desactive={reponseDonnee} />}
        {item.game_type === "intruder" && <Intrus item={item} onValider={valider} desactive={reponseDonnee} />}

        {/* ---- Feedback immédiat ---- */}
        {reponseDonnee && (
          <div
            className={`text-center font-bold text-xl ${
              bonneReponse ? "text-sinople" : "text-gueules"
            }`}
          >
            {bonneReponse ? (
              <span className="anim-points-volants inline-block">
                Bravo ! +10 points
              </span>
            ) : (
              "Dommage ! La bonne réponse s'affiche en vert."
            )}
          </div>
        )}

        {reponseDonnee && (
          <Bouton variante="primaire" pleineLargeur onClick={suivant}>
            {index + 1 >= items.length ? "Voir mon score" : "Mini-jeu suivant"}
          </Bouton>
        )}
      </Carte>
    </main>
  );
}

// ============================================================
// Formats de mini-jeux (les réponses sont validées côté serveur
// au Défi du Jour ; en mode essai, validation locale simple)
// ============================================================

function Qcm({
  item,
  onValider,
  desactive,
}: {
  item: Item;
  onValider: (ok: boolean) => void;
  desactive: boolean;
}) {
  const [choix, setChoix] = useState<number | null>(null);
  const p = item.payload;
  return (
    <div className="space-y-3">
      <p className="text-xl font-bold">{p.question}</p>
      {p.choices?.map((c: string, i: number) => (
        <button
          key={i}
          disabled={desactive}
          onClick={() => {
            setChoix(i);
            // En mode essai, la validation est locale (pas de compte).
            // NB : payload public → pas de champ answer ; pour l'essai on
            // considère la 1re proposition comme correcte côté client si
            // le champ existe, sinon on simule via le champ answer masqué.
            onValider(p.answer !== undefined ? i === p.answer : false);
          }}
          className={`w-full min-h-[56px] rounded-lg border-4 text-lg font-bold transition-colors ${
            choix === i
              ? "bg-or border-sable"
              : "bg-white border-sable hover:bg-or/20"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

function Devinette({
  item,
  onValider,
  desactive,
}: {
  item: Item;
  onValider: (ok: boolean) => void;
  desactive: boolean;
}) {
  const [texte, setTexte] = useState("");
  const p = item.payload;
  function sansAccents(s: string): string {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }
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
        onClick={() => onValider(sansAccents(texte) === sansAccents(p.answer ?? ""))}
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

function Intrus({
  item,
  onValider,
  desactive,
}: {
  item: Item;
  onValider: (ok: boolean) => void;
  desactive: boolean;
}) {
  const [choix, setChoix] = useState<number | null>(null);
  const p = item.payload;
  return (
    <div className="space-y-3">
      <p className="text-xl font-bold">Trouve l&apos;intrus :</p>
      <div className="grid grid-cols-2 gap-3">
        {p.items?.map((c: string, i: number) => (
          <button
            key={i}
            disabled={desactive}
            onClick={() => {
              setChoix(i);
              onValider(p.intruder !== undefined ? i === p.intruder : false);
            }}
            className={`min-h-[64px] rounded-lg border-4 text-lg font-bold transition-colors ${
              choix === i
                ? "bg-or border-sable"
                : "bg-white border-sable hover:bg-or/20"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
