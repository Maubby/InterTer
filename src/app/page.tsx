"use client";

import Image from "next/image";
import { Bouton } from "@/components/Bouton";
import { Carte, Lettrine, Titre } from "@/components/Carte";
import { Separateur } from "@/components/Fioritures";
import { Eclair, Epees, Etoile, Flamme, Trophee } from "@/components/Icons";

export default function Accueil() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <header className="text-center space-y-3">
        {/* Le logo est dans l'en-tête : la banderole donne le sous-titre */}
        <Titre>Le Tournoi des Villes de France</Titre>
        <p className="text-xl text-sable">
          Chaque jour, une Quête du Jour pour faire briller ta ville face à toute
          la France.
        </p>
      </header>

      {/* La Conteuse accueille le joueur : c'est elle qui ouvre le grand livre */}
      <Carte className="flex flex-col sm:flex-row items-center gap-5">
        <Image
          src="/personnages/conteuse-salue.webp"
          alt="La Conteuse, qui te salue"
          width={128}
          height={128}
          unoptimized
          priority
          className="w-32 h-32 shrink-0 rounded-full border-4 border-or outline-2 outline-sable bg-parchemin-2 anim-reverence"
        />
        <p className="text-lg">
          <Lettrine lettre="B" />
          ienvenue dans le grand tournoi des villes ! Je suis la Conteuse :
          chaque jour, j&apos;ouvre mon grand livre sur une nouvelle Quête.
          À toi de faire briller ton terter !
        </p>
      </Carte>

      <Separateur />

      <div className="grid gap-3">
        <Bouton
          variante="primaire"
          pleineLargeur
          onClick={() => (window.location.href = "/defi-du-jour")}
        >
          <Eclair className="w-6 h-6" /> Vivre la Quête du Jour
        </Bouton>
        <Bouton
          variante="secondaire"
          pleineLargeur
          onClick={() => (window.location.href = "/duel")}
        >
          <Epees className="w-6 h-6" /> Défier mes amis
        </Bouton>
        <Bouton
          variante="enigme"
          pleineLargeur
          onClick={() => (window.location.href = "/classement")}
        >
          <Trophee className="w-6 h-6" /> Voir le classement
        </Bouton>
        <Bouton
          variante="succes"
          pleineLargeur
          onClick={() => (window.location.href = "/essai")}
        >
          <Etoile className="w-6 h-6" /> Essayer sans compte
        </Bouton>
      </div>

      <Carte className="flex items-center gap-3">
        <Flamme className="w-8 h-8 text-gueules" />
        <p>
          Reviens chaque jour pour garder ta série et faire monter ta ville au
          classement national.
        </p>
      </Carte>
    </main>
  );
}
