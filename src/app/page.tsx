"use client";

import Image from "next/image";
import { Bouton } from "@/components/Bouton";
import { Carte, Titre } from "@/components/Carte";
import { Eclair, Etoile, Flamme, Trophee } from "@/components/Icons";

export default function Accueil() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <header className="text-center space-y-3">
        <Image
          src="/logo/logo-512.svg"
          alt="Logo Interter"
          width={160}
          height={160}
          unoptimized
          className="mx-auto w-40 h-40"
        />
        <Titre>Interter</Titre>
        <p className="text-xl text-sable">
          Chaque jour, une Quête du Jour pour faire briller ta ville face à toute
          la France.
        </p>
      </header>

      <Carte className="flex items-center gap-4">
        <Image
          src="/mascotte/margot-bienvenue.svg"
          alt="Margot, la Dame Voyageuse"
          width={96}
          height={96}
          unoptimized
          className="w-24 h-24 rounded-lg border-2 border-sable"
        />
        <p className="text-lg">
          <span className="lettrine mr-2">B</span>
          ienvenue dans le grand tournoi des villes ! Je suis Margot, la Dame
          Voyageuse. Prête à défendre ton terter ?
        </p>
      </Carte>

      <div className="grid gap-3">
        <Bouton
          variante="primaire"
          pleineLargeur
          onClick={() => (window.location.href = "/defi-du-jour")}
        >
          <Eclair className="w-6 h-6" /> Vivre la Quête du Jour
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
