"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { memoriserRetour } from "@/lib/duel";
import { Bouton } from "@/components/Bouton";
import { Carte, Lettrine, Titre } from "@/components/Carte";
import { Separateur } from "@/components/Fioritures";
import { Epees } from "@/components/Icons";
import { MesAmis } from "@/components/MesAmis";

// Un duel dans la liste « Mes duels » (list_my_duels)
type DuelResume = {
  code: string;
  createur: string;
  je_suis_createur: boolean;
  cree_le: string;
  expire: boolean;
  nb_joueurs: number;
  mon_score: number | null;
  meilleur_adverse: number | null;
  adresse_a: string[] | null;
};

// Où en est le duel, du point de vue du joueur
function etat(d: DuelResume): { texte: string; couleur: string } {
  if (d.mon_score === null) {
    return d.expire
      ? { texte: "Terminé", couleur: "bg-parchemin-2 text-sable/60" }
      : { texte: "À toi de jouer", couleur: "bg-or text-sable" };
  }
  if (d.meilleur_adverse === null) {
    return { texte: "En attente d'adversaires", couleur: "bg-parchemin-2 text-sable" };
  }
  if (d.mon_score > d.meilleur_adverse) return { texte: "Victoire", couleur: "bg-sinople text-white" };
  if (d.mon_score < d.meilleur_adverse) return { texte: "Défaite", couleur: "bg-gueules text-white" };
  return { texte: "Égalité", couleur: "bg-azur text-white" };
}

export default function PageDuels() {
  const supabase = getSupabaseBrowserClient();
  const [phase, setPhase] = useState<"chargement" | "connecte-toi" | "sans-ville" | "pret">("chargement");
  const [duels, setDuels] = useState<DuelResume[]>([]);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

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
        .maybeSingle();
      if (!profil?.city_id) {
        setPhase("sans-ville");
        return;
      }
      const { data } = await supabase.rpc("list_my_duels");
      setDuels((data as DuelResume[]) ?? []);
      setPhase("pret");
    })();
  }, [supabase]);

  async function lancer() {
    setEnCours(true);
    setErreur(null);
    const { data, error } = await supabase.rpc("create_duel");
    if (error || !data) {
      setErreur(error?.message ?? "Impossible de lancer le duel");
      setEnCours(false);
      return;
    }
    window.location.href = `/duel/${data}`;
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <header className="text-center space-y-3">
        <Titre>Duel entre amis</Titre>
      </header>

      <Carte className="flex flex-col sm:flex-row items-center gap-5">
        <Image
          src="/personnages/aaron-question.webp"
          alt="Aaron le Forgeron, marteau sur l'épaule"
          width={128}
          height={128}
          unoptimized
          priority
          className="w-32 h-32 shrink-0 rounded-full border-4 border-or outline-2 outline-sable bg-parchemin-2 anim-reverence"
        />
        <p className="text-lg">
          <Lettrine lettre="D" couleur="azur" />
          éfie tes amis sur 5 questions ! Chacun joue quand il veut, avec le
          lien que tu lui envoies. Le meilleur score l&apos;emporte.
        </p>
      </Carte>

      {phase === "chargement" && <p className="text-center">Chargement…</p>}

      {phase === "connecte-toi" && (
        <Bouton
          variante="primaire"
          pleineLargeur
          onClick={() => {
            memoriserRetour("/duel");
            window.location.href = "/connexion";
          }}
        >
          Connecte-toi pour lancer un duel
        </Bouton>
      )}

      {phase === "sans-ville" && (
        <Bouton
          variante="primaire"
          pleineLargeur
          onClick={() => {
            memoriserRetour("/duel");
            window.location.href = "/choisir-ma-ville";
          }}
        >
          Choisis d&apos;abord ta ville
        </Bouton>
      )}

      {phase === "pret" && (
        <>
          {erreur && <p className="text-gueules font-bold text-center">{erreur}</p>}
          <section className="space-y-3">
            <Titre niveau={2}>Mes amis</Titre>
            <MesAmis />
          </section>

          <Separateur />

          <section className="space-y-3">
            <Titre niveau={2}>Défier quelqu&apos;un d&apos;autre</Titre>
            <p className="text-sable/70">
              Tu joues ta manche, puis tu envoies le duel à qui tu veux, par
              WhatsApp, SMS ou Messenger.
            </p>
            <Bouton variante="secondaire" pleineLargeur onClick={lancer} disabled={enCours}>
              <Epees className="w-6 h-6" /> {enCours ? "Préparation…" : "Lancer un duel"}
            </Bouton>
          </section>

          <Separateur />

          <section className="space-y-3">
            <Titre niveau={2}>Mes duels</Titre>
            {duels.length === 0 ? (
              <p className="text-sable/70">
                Aucun duel pour l&apos;instant. Lance le premier et envoie le lien
                à tes amis !
              </p>
            ) : (
              <ul className="space-y-3">
                {duels.map((d) => {
                  const e = etat(d);
                  return (
                    <li key={d.code}>
                      <Link
                        href={`/duel/${d.code}`}
                        className="choix flex items-center justify-between gap-3 no-underline"
                        style={{ animation: "none" }}
                      >
                        <span className="min-w-0">
                          <span className="block font-cinzel font-bold">
                            {d.je_suis_createur
                              ? d.adresse_a?.length
                                ? `Défi à ${d.adresse_a.join(", ")}`
                                : "Mon duel"
                              : `Défi de ${d.createur}`}
                          </span>
                          <span className="block text-sm font-normal text-sable/70">
                            {d.nb_joueurs} joueur{d.nb_joueurs > 1 ? "s" : ""}
                            {d.mon_score !== null && ` · ton score : ${d.mon_score}`}
                          </span>
                        </span>
                        <span className={`shrink-0 rounded-md border-2 border-sable px-2 py-1 text-sm font-bold ${e.couleur}`}>
                          {e.texte}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
