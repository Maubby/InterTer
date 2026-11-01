"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { GUILDE } from "@/lib/guilde";
import { lienSms, lienWhatsApp, memoriserRetour, partagerDuel, type ScoreInvitation } from "@/lib/duel";
import { Bouton } from "@/components/Bouton";
import { Carte, Lettrine, Titre } from "@/components/Carte";
import { Epreuve, HoteEpreuve, type Item } from "@/components/Epreuves";
import { Compteur, Eclats, Feuillets, Sceau, chiffreRomain } from "@/components/Fioritures";
import { Verdict } from "@/components/Jeu";
import { Epees } from "@/components/Icons";

// Le duel tel que le renvoie get_duel
type Joueur = {
  pseudo: string;
  ville: string | null;
  score: number | null;
  correct_count: number | null;
  moi: boolean;
  createur: boolean;
};
type InfosDuel = {
  code: string;
  createur: string;
  je_suis_createur: boolean;
  expire: boolean;
  a_joue: boolean;
  mon_score: number | null;
  total: number;
  items: Item[] | null;
  joueurs: Joueur[];
};

type Phase =
  | "chargement"
  | "introuvable"
  | "invite"
  | "sans-ville"
  | "accueil"
  | "question"
  | "scores";

export default function Duel() {
  const { code } = useParams<{ code: string }>();
  const supabase = getSupabaseBrowserClient();

  const [phase, setPhase] = useState<Phase>("chargement");
  const [duel, setDuel] = useState<InfosDuel | null>(null);
  const [index, setIndex] = useState(0);
  const [reponses, setReponses] = useState<{ item_id: string; answer: unknown }[]>([]);
  const [reponseDonnee, setReponseDonnee] = useState(false);
  const [bonneReponse, setBonneReponse] = useState<boolean | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [vientDeJouer, setVientDeJouer] = useState(false);

  const charger = useCallback(async () => {
    const { data } = await supabase.rpc("get_duel", { p_code: code });
    const infos = data as InfosDuel | null;
    if (!infos) {
      setPhase("introuvable");
      return;
    }
    setDuel(infos);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPhase("invite");
      return;
    }
    const { data: profil } = await supabase
      .from("profiles")
      .select("city_id")
      .eq("id", user.id)
      .maybeSingle();
    if (!profil?.city_id) {
      setPhase("sans-ville");
      return;
    }
    // Le créateur joue tout de suite ; il invitera ses amis avec son score
    setPhase(infos.a_joue || infos.expire ? "scores" : infos.je_suis_createur ? "question" : "accueil");
  }, [supabase, code]);

  useEffect(() => {
    (async () => {
      await charger();
    })();
  }, [charger]);

  // Correction immédiate, pour le plaisir ; le vrai score est calculé
  // par le serveur à la fin (play_duel)
  async function noterReponse(answer: unknown) {
    if (!duel?.items || reponseDonnee || enCours) return;
    setEnCours(true);
    const item = duel.items[index];
    const { data } = await supabase.rpc("check_practice_item", {
      p_item_id: item.id,
      p_answer: answer,
    });
    setBonneReponse((data as { is_correct?: boolean } | null)?.is_correct === true);
    setReponseDonnee(true);
    setReponses((r) => [...r, { item_id: item.id, answer }]);
    setEnCours(false);
  }

  async function suivant() {
    if (!duel?.items) return;
    if (index + 1 < duel.items.length) {
      setIndex((i) => i + 1);
      setReponseDonnee(false);
      setBonneReponse(null);
      return;
    }
    setEnCours(true);
    const { error } = await supabase.rpc("play_duel", { p_code: code, p_answers: reponses });
    if (error) {
      setErreur(error.message);
      setEnCours(false);
      return;
    }
    setVientDeJouer(true);
    await charger();
    setEnCours(false);
  }

  function seConnecter(vers: string) {
    memoriserRetour(`/duel/${code}`);
    window.location.href = vers;
  }

  // ---------- Duel inconnu ----------
  if (phase === "introuvable") {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 space-y-6 text-center">
        <Titre>Duel introuvable</Titre>
        <Carte className="space-y-4">
          <p className="text-lg">
            Ce lien ne mène à aucun duel. Vérifie le message de ton ami, ou lance
            ton propre duel !
          </p>
          <Bouton variante="primaire" pleineLargeur onClick={() => (window.location.href = "/duel")}>
            <Epees className="w-6 h-6" /> Lancer un duel
          </Bouton>
        </Carte>
      </main>
    );
  }

  if (phase === "chargement" || !duel) {
    return <main className="mx-auto max-w-lg px-4 py-8 text-center">Chargement du duel…</main>;
  }

  // ---------- Invitation (pas de compte, ou pas de ville) ----------
  if (phase === "invite" || phase === "sans-ville") {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 space-y-6 text-center">
        <Titre>{`${duel.createur} te défie !`}</Titre>
        <Invitation duel={duel} />
        {duel.expire ? (
          <p className="text-lg font-bold text-gueules">Ce duel est terminé : il durait 7 jours.</p>
        ) : phase === "invite" ? (
          <Bouton variante="primaire" pleineLargeur onClick={() => seConnecter("/connexion")} className="anim-respire">
            <Epees className="w-6 h-6" /> Relever le défi
          </Bouton>
        ) : (
          <Bouton variante="primaire" pleineLargeur onClick={() => seConnecter("/choisir-ma-ville")}>
            Choisis d&apos;abord ta ville
          </Bouton>
        )}
        {phase === "invite" && !duel.expire && (
          <p className="text-base text-sable/70">
            Un compte gratuit suffit : connecte-toi avec Google, Facebook ou ton email,
            et tu reviens directement sur ce duel.
          </p>
        )}
      </main>
    );
  }

  // ---------- Un ami invité, avant de jouer ----------
  if (phase === "accueil") {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 space-y-6 text-center">
        <Titre>{`${duel.createur} te défie !`}</Titre>
        <Invitation duel={duel} />
        <Bouton
          variante="succes"
          pleineLargeur
          className="anim-respire"
          onClick={() => {
            setIndex(0);
            setReponses([]);
            setPhase("question");
          }}
        >
          <Epees className="w-6 h-6" /> Relever le défi
        </Bouton>
      </main>
    );
  }

  // ---------- Les 5 questions ----------
  if (phase === "question" && duel.items?.[index]) {
    const item = duel.items[index];
    const hote = GUILDE[item.theme ?? item.game_type];
    return (
      <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
        <Feuillets total={duel.items.length} courant={index} />
        <Titre niveau={2}>
          Duel · feuillet {index + 1} sur {duel.items.length}
        </Titre>
        <div key={item.id} className="anim-page">
          <Carte
            className={`space-y-4 ${
              reponseDonnee ? (bonneReponse ? "anim-halo border-sinople" : "anim-secousse border-gueules") : ""
            }`}
          >
            <HoteEpreuve key={item.id} hote={hote} reponseDonnee={reponseDonnee} bonneReponse={bonneReponse} />
            <Epreuve
              item={item}
              onValider={noterReponse}
              desactive={reponseDonnee || enCours}
              verdict={reponseDonnee ? bonneReponse : null}
            />
            {reponseDonnee && (
              <>
                <Verdict juste={bonneReponse === true} />
                {item.payload?.explanation && (
                  <div className="chronique glose">
                    <strong className="font-cinzel not-italic">
                      <span className="rubrique" aria-hidden="true">¶ </span>Selon la Chronique…
                    </strong>{" "}
                    {item.payload.explanation}
                  </div>
                )}
                {erreur && <p className="text-gueules font-bold text-center">{erreur}</p>}
                <Bouton variante="primaire" pleineLargeur onClick={suivant} disabled={enCours}>
                  {index + 1 >= duel.items.length
                    ? enCours
                      ? "Le sceau se pose…"
                      : "Voir qui l'emporte !"
                    : "Tourner la page"}
                </Bouton>
              </>
            )}
          </Carte>
        </div>
      </main>
    );
  }

  // ---------- Tableau des scores ----------
  return <TableauDuel duel={duel} vientDeJouer={vientDeJouer} />;
}

// Qui a lancé le duel, et qui a déjà joué (sans les scores, pour le suspense)
function Invitation({ duel }: { duel: InfosDuel }) {
  const autres = duel.joueurs.filter((j) => !j.moi);
  return (
    <Carte className="space-y-3 text-left">
      <p className="text-lg">
        <Lettrine lettre="C" couleur="azur" />
        inq questions sur nos villes de France, les mêmes pour tout le monde.
        Joue quand tu veux : le meilleur score l&apos;emporte !
      </p>
      {autres.length > 0 && (
        <p className="note-ancienne text-base text-sable/80 clear-both pt-1">
          Déjà joué : {autres.map((j) => j.pseudo).join(", ")}
        </p>
      )}
    </Carte>
  );
}

// Défier un ami : un seul bouton, qui ouvre le partage du téléphone (WhatsApp,
// SMS, Messenger…) avec un message prêt. Sans partage natif (ordinateur), le
// lien est copié et WhatsApp / SMS apparaissent en secours.
function Partage({ code, score }: { code: string; score: ScoreInvitation }) {
  const [message, setMessage] = useState<string | null>(null);
  const [secours, setSecours] = useState(false);
  return (
    <div className="space-y-3">
      <Bouton
        variante="primaire"
        pleineLargeur
        className="anim-respire"
        onClick={async () => {
          const r = await partagerDuel(code, score);
          if (r === "copie" || r === "echec") setSecours(true);
          setMessage(
            r === "copie"
              ? "Lien copié ! Colle-le dans un message, ou choisis :"
              : r === "echec"
                ? "Envoie le duel par :"
                : null
          );
        }}
      >
        <Epees className="w-6 h-6" /> Défier un ami
      </Bouton>
      <p className="text-base text-sable/70">
        Il recevra un lien pour jouer les mêmes questions.
      </p>
      {message && (
        <p className="font-bold text-sinople" role="status">
          {message}
        </p>
      )}
      {secours && (
        <div className="grid grid-cols-2 gap-3">
          <a href={lienWhatsApp(code, score)} target="_blank" rel="noopener noreferrer" className="choix justify-center" style={{ animation: "none" }}>
            WhatsApp
          </a>
          <a href={lienSms(code, score)} className="choix justify-center" style={{ animation: "none" }}>
            SMS
          </a>
        </div>
      )}
    </div>
  );
}

// Le classement du duel, une fois joué (ou terminé)
function TableauDuel({ duel, vientDeJouer }: { duel: InfosDuel; vientDeJouer: boolean }) {
  const moi = duel.joueurs.find((j) => j.moi);
  const meilleurAutre = Math.max(-1, ...duel.joueurs.filter((j) => !j.moi).map((j) => j.score ?? -1));
  const verdict = !moi
    ? { texte: "Duel terminé", classe: "" }
    : meilleurAutre < 0
      ? { texte: "En attente de tes amis", classe: "banderole-azur" }
      : (moi.score ?? 0) > meilleurAutre
        ? { texte: "Victoire !", classe: "banderole-sinople" }
        : (moi.score ?? 0) < meilleurAutre
          ? { texte: "Défaite…", classe: "" }
          : { texte: "Égalité !", classe: "banderole-azur" };
  const victoire = verdict.classe === "banderole-sinople";

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6 text-center">
      <div className="relative">
        {victoire && vientDeJouer && <Eclats className="left-1/2 top-1/2" nombre={20} portee={150} />}
        <h1 className="font-cinzel font-bold text-3xl md:text-4xl">
          <span className={`banderole ${verdict.classe}`}>{verdict.texte}</span>
        </h1>
      </div>

      {moi && (
        <p className="text-xl">
          Ton score :{" "}
          <strong className="font-cinzel text-3xl text-sinople">
            {vientDeJouer ? <Compteur valeur={moi.score ?? 0} /> : moi.score}
          </strong>{" "}
          / {duel.total}
        </p>
      )}
      {!moi && duel.expire && (
        <p className="text-lg text-gueules font-bold">Ce duel est terminé : il durait 7 jours.</p>
      )}

      <Carte className="space-y-3 text-left">
        {victoire && <Sceau className="absolute -top-7 -right-5 w-20 h-20 anim-sceau" />}
        <p className="font-cinzel font-bold text-lg">
          <span className="rubrique" aria-hidden="true">¶ </span>
          {duel.je_suis_createur ? "Ton duel" : `Le duel de ${duel.createur}`}
        </p>
        <ol className="space-y-2">
          {duel.joueurs.map((j, i) => (
            <li
              key={`${j.pseudo}-${i}`}
              className={`flex items-center gap-3 rounded-lg border-2 px-3 py-2 ${
                j.moi ? "border-or bg-or/20" : "border-sable/20 bg-parchemin-2/60"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2 border-sable font-cinzel font-black ${
                  i === 0 && j.score !== null ? "bg-or text-sable" : "bg-parchemin text-sable"
                }`}
                aria-label={`Rang ${i + 1}`}
              >
                {chiffreRomain(i + 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold truncate">
                  {j.pseudo}
                  {j.moi && " (toi)"}
                </span>
                {j.ville && <span className="block text-sm text-sable/60 truncate">{j.ville}</span>}
              </span>
              <span className="font-cinzel font-black text-xl text-sinople">
                {j.score ?? "?"}
              </span>
            </li>
          ))}
        </ol>
        {meilleurAutre < 0 && moi && (
          <p className="text-base text-sable/70">
            Personne d&apos;autre n&apos;a encore joué : défie un ami, son score
            apparaîtra ici.
          </p>
        )}
      </Carte>

      {!duel.expire && (
        <Partage code={duel.code} score={moi?.score != null ? { score: moi.score, total: duel.total } : null} />
      )}

      <Bouton variante="secondaire" pleineLargeur onClick={() => (window.location.href = "/duel")}>
        Mes duels
      </Bouton>
    </main>
  );
}
