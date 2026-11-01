"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Bouton } from "@/components/Bouton";
import { Carte, Lettrine, Titre } from "@/components/Carte";
import { Verdict } from "@/components/Jeu";
import { Epreuve, HoteEpreuve, type Item } from "@/components/Epreuves";
import { GUILDE } from "@/lib/guilde";
import { Compteur, Eclats, Feuillets, Separateur, Sceau, RoseDesVents } from "@/components/Fioritures";
import { Etoile, Flamme, Trophee } from "@/components/Icons";

// ---------- Types ----------
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
    const { data: itemsData, error: errItems } = await supabase
      .from("game_items_public")
      .select("id, game_type, theme, payload")
      .in("id", data.item_ids);
    if (errItems || !itemsData) {
      console.error("Erreur chargement items:", errItems);
      setErreur(
        "Impossible de charger les mini-jeux du jour : " +
          (errItems?.message ?? "réponse vide")
      );
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
            comptent <strong>quintuple</strong> pour ta ville !
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
        <Carte className="anim-deroule space-y-4">
          {/* La quête est scellée, comme une charte */}
          <Sceau className="absolute -top-7 -right-5 w-20 h-20 anim-sceau" />
          <div className="relative w-fit mx-auto">
            <Trophee taille={64} className="text-or anim-saut" />
            <Eclats className="left-1/2 top-1/2" nombre={20} portee={140} />
          </div>
          <p className="text-2xl font-bold">
            {resultat.correct_count}/{resultat.total / 10} bonnes réponses
          </p>
          <p className="text-xl">
            <strong>{resultat.score} points</strong> pour ta ville — soit{" "}
            <strong className="text-sinople text-3xl font-cinzel">
              <Compteur valeur={resultat.score * 5} /> points
            </strong>{" "}
            comptés au classement (×5 Quête du Jour) !
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
    const hote = GUILDE[item.theme ?? item.game_type];
    return (
      <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
        {/* Les feuillets de la quête */}
        <Feuillets total={items.length} courant={index} />

        <Titre niveau={2}>
          Feuillet {index + 1} sur {items.length}
        </Titre>

        {/* Chaque épreuve arrive comme une page qu'on tourne */}
        <div key={item.id} className="anim-page">
        <Carte
          className={`space-y-4 ${
            reponseDonnee
              ? bonneReponse
                ? "anim-halo border-sinople"
                : "anim-secousse border-gueules"
              : ""
          }`}
        >
          <HoteEpreuve key={item.id} hote={hote} reponseDonnee={reponseDonnee} bonneReponse={bonneReponse} />
          <Epreuve item={item} onValider={noterReponse} desactive={reponseDonnee || enCours} verdict={reponseDonnee ? bonneReponse : null} />

          {reponseDonnee && (
            <>
              <Verdict juste={bonneReponse === true} />
              {item.payload?.explanation && (
                <div className="chronique glose">
                  <strong className="font-cinzel not-italic"><span className="rubrique" aria-hidden="true">¶ </span>Selon la Chronique…</strong> {item.payload.explanation}
                </div>
              )}
              <Bouton variante="primaire" pleineLargeur onClick={suivant} disabled={enCours}>
                {index + 1 >= items.length ? "Envoyer mes réponses !" : "Tourner la page"}
              </Bouton>
            </>
          )}
        </Carte>
        </div>
      </main>
    );
  }

  // ---------- Écran d'accueil du défi ----------
  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6 text-center">
      <Titre>La Quête du Jour</Titre>
      <Carte className="space-y-4">
        <p className="text-lg text-left">
          <Lettrine lettre="C" couleur="azur" />
          haque jour, <strong>une nouvelle Quête t&apos;attend</strong> : 5
          défis inédits concoctés par la guilde du village — jamais vus,
          jamais revus !
        </p>
        <p className="text-base">
          Tes points comptent <strong>×5</strong> pour ta ville, et
          chaque jour joué rallonge ta série{" "}
          <Flamme className="anim-flamme inline w-5 h-5 text-gueules" /> !
        </p>
        <Separateur />
        {erreur && <p className="text-gueules font-bold">{erreur}</p>}
        {phase === "chargement" ? (
          <p>Chargement…</p>
        ) : (
          <Bouton variante="succes" pleineLargeur onClick={demarrer} disabled={enCours} className="anim-respire">
            {enCours ? "Préparation…" : "C'est parti !"}
          </Bouton>
        )}
      </Carte>
    </main>
  );
}
