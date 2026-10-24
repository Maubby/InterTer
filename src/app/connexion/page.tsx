"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Bouton } from "@/components/Bouton";
import { Carte, Titre } from "@/components/Carte";
import { Bouclier } from "@/components/Icons";
import Image from "next/image";

// Page de connexion : gros boutons, ton simple, cible senior.
// Google est le premier (le plus simple), Facebook viendra ensuite.
export default function PageConnexion() {
  const supabase = getSupabaseBrowserClient();

  async function connexionGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Après la connexion Google, Supabase renvoie ici
        redirectTo: `${window.location.origin}/choisir-ma-ville`,
      },
    });
    if (error) {
      alert("Connexion impossible : " + error.message);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <header className="text-center space-y-3">
        <Image
          src="/mascotte/margot-bienvenue.svg"
          alt="Margot, la Dame Voyageuse"
          width={96}
          height={96}
          unoptimized
          className="mx-auto"
        />
        <Titre>Rejoins le tournoi</Titre>
        <p className="text-lg">
          Connecte-toi en un clic pour défendre ta ville. C&apos;est gratuit !
        </p>
      </header>

      <Carte className="text-center space-y-4">
        <button
          onClick={connexionGoogle}
          className="w-full min-h-[64px] rounded-lg border-4 border-sable bg-white text-sable text-xl font-bold shadow-enchere active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-transform"
        >
          Se connecter avec Google
        </button>
        <p className="text-base text-sable/70">
          Aucun mot de passe à retenir : Google s&apos;occupe de tout.
        </p>
      </Carte>

      <Carte className="flex items-start gap-3">
        <Bouclier className="w-8 h-8 text-azur shrink-0" />
        <p className="text-base">
          <strong>Pourquoi un compte ?</strong> Pour que tes points comptent
          pour ta ville ! Sans compte, tu peux essayer le jeu, mais ton score ne
          part nulle part.
        </p>
      </Carte>
    </main>
  );
}
