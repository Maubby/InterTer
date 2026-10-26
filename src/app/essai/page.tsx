"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Bouton } from "@/components/Bouton";
import { Carte, Titre } from "@/components/Carte";
import { Etoile, Trophee } from "@/components/Icons";

// ---------- Types ----------
type GameType = "qcm" | "true_false" | "riddle" | "emoji_riddle" | "intruder" | "order_dates";
type Item = { id: string; game_type: GameType; payload: any };

const TYPES_ESSAI: GameType[] = ["qcm", "riddle", "intruder"];

export default function PageEssai() {
  const supabase = getSupabaseBrowserClient();
  const [items, setItems] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [enCours, setEnCours] = useState(false);
  const [reponseDonnee, setReponseDonnee] = useState(false);
  const [bonneReponse, setBonneReponse] = useState<boolean | null>(null);
  const [fini, setFini] = useState(false);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await Promise.all(
        TYPES_ESSAI.map((t) =>
          supabase
            .from("game_items_public")
            .select("id, game_type, payload")
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

  // Validation TOUJOURS côté serveur (RPC check_practice_item) :
  // le navigateur ne connaît jamais la réponse → anti-triche par construction.
  const valider = useCallback(
    async (answer: any) => {
      if (enCours || reponseDonnee) return;
      setEnCours(true);
      const { data, error } = await supabase.rpc("check_practice_item", {
        p_item_id: items[index]?.id,
        p_answer: answer,
      });
      if (error) {
        alert("Erreur de validation : " + error.message);
        setEnCours(false);
        return;
      }
      const ok = (data as any)?.is_correct === true;
      setBonneReponse(ok);
      setReponseDonnee(true);
      if (ok) setScore((s) => s + 10);
      setEnCours(false);
    },
    [supabase, items, index, enCours, reponseDonnee]
  );

  function suivant() {
    if (index + 1 >= items.length) setFini(true);
    else {
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

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 text-center space-y-4">
        <p>Aucun mini-jeu disponible pour le moment.</p>
      </main>
    );
  }

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
        <span className="font-cinzel font-bold ml-2">{score} pts</span>
      </div>

      <Titre niveau={2}>
        Mini-jeu {index + 1} sur {items.length}
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
        {item.game_type === "qcm" && (
          <Qcm onValider={valider} desactive={reponseDonnee || enCours} p={item.payload} />
        )}
        {item.game_type === "riddle" && (
          <Devinette onValider={valider} desactive={reponseDonnee || enCours} p={item.payload} />
        )}
        {item.game_type === "intruder" && (
          <Intrus onValider={valider} desactive={reponseDonnee || enCours} p={item.payload} />
        )}

        {reponseDonnee && (
          <>
            <div
              className={`text-center font-bold text-xl ${
                bonneReponse ? "text-sinople" : "text-gueules"
              }`}
            >
              {bonneReponse ? (
                <span className="anim-points-volants inline-block">Bravo ! +10 points</span>
              ) : (
                "Dommage !"
              )}
            </div>
            {/* Explication pédagogique : on apprend toujours quelque chose */}
            {item.payload?.explanation && (
              <div className="chronique bg-parchemin rounded-lg border-2 border-sable/30 p-3">
                <strong className="font-cinzel">Selon la Chronique…</strong> {item.payload.explanation}
              </div>
            )}
          </>
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
// Formats — ils envoient juste le choix au serveur, qui valide.
// ============================================================

function Qcm({
  onValider,
  desactive,
  p,
}: {
  onValider: (answer: any) => void;
  desactive: boolean;
  p: any;
}) {
  const [choix, setChoix] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      <p className="text-xl font-bold">{p.question}</p>
      {p.choices?.map((c: string, i: number) => (
        <button
          key={i}
          disabled={desactive}
          onClick={() => {
            setChoix(i);
            onValider({ choice: i });
          }}
          className={`w-full min-h-[56px] rounded-lg border-4 text-lg font-bold transition-colors ${
            choix === i ? "bg-or border-sable" : "bg-white border-sable hover:bg-or/20"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

function Devinette({
  onValider,
  desactive,
  p,
}: {
  onValider: (answer: any) => void;
  desactive: boolean;
  p: any;
}) {
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

function Intrus({
  onValider,
  desactive,
  p,
}: {
  onValider: (answer: any) => void;
  desactive: boolean;
  p: any;
}) {
  const [choix, setChoix] = useState<number | null>(null);
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
              onValider({ intruder_index: i });
            }}
            className={`min-h-[64px] rounded-lg border-4 text-lg font-bold transition-colors ${
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
