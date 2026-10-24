"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Bouton } from "@/components/Bouton";
import { Carte, Titre } from "@/components/Carte";
import { Bouclier } from "@/components/Icons";
import Image from "next/image";

// Page de connexion : Google, Facebook, et email/mot de passe.
// Gros boutons, ton simple, cible senior.
export default function PageConnexion() {
  const supabase = getSupabaseBrowserClient();

  // --- Email + mot de passe ---
  const [mode, setMode] = useState<"choix" | "email">("choix");
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function connexionGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/choisir-ma-ville`,
      },
    });
    if (error) alert("Connexion impossible : " + error.message);
  }

  async function connexionFacebook() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: `${window.location.origin}/choisir-ma-ville`,
      },
    });
    if (error) alert("Connexion impossible : " + error.message);
  }

  // Inscription OU connexion par email : Supabase gère les deux —
  // si l'email est inconnu, signUp crée le compte ; sinon, on connecte.
  async function connexionEmail() {
    if (!email.includes("@") || mdp.length < 6) {
      setMessage("Email valide et mot de passe de 6 caractères minimum.");
      return;
    }
    setChargement(true);
    setMessage(null);

    // 1) tenter la connexion
    const { data: signIn, error: errIn } = await supabase.auth.signInWithPassword({
      email,
      password: mdp,
    });

    if (!errIn && signIn.user) {
      window.location.href = "/choisir-ma-ville";
      return;
    }

    // 2) si échec → tentative de création de compte
    const { data: signUp, error: errUp } = await supabase.auth.signUp({
      email,
      password: mdp,
      options: {
        emailRedirectTo: `${window.location.origin}/choisir-ma-ville`,
      },
    });

    if (errUp) {
      setMessage(errUp.message);
      setChargement(false);
      return;
    }
    if (signUp.session) {
      // Compte créé et connecté directement
      window.location.href = "/choisir-ma-ville";
      return;
    }
    // Compte créé mais email non confirmé (par défaut Supabase envoie un lien)
    setMessage(
      "Compte créé ! Clique sur le lien envoyé dans ta boîte mail pour confirmer ton adresse."
    );
    setChargement(false);
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

      {mode === "choix" ? (
        <Carte className="space-y-4">
          <button
            onClick={connexionGoogle}
            className="w-full min-h-[64px] rounded-lg border-4 border-sable bg-white text-sable text-xl font-bold shadow-enchere active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-transform"
          >
            Se connecter avec Google
          </button>
          <button
            onClick={connexionFacebook}
            className="w-full min-h-[64px] rounded-lg border-4 border-sable bg-azur text-white text-xl font-bold shadow-enchere active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-transform"
          >
            Se connecter avec Facebook
          </button>
          <button
            onClick={() => setMode("email")}
            className="w-full min-h-[64px] rounded-lg border-4 border-sable bg-parchemin-2 text-sable text-xl font-bold shadow-enchere active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-transform"
          >
            Avec mon email
          </button>
          <p className="text-base text-sable/70 text-center">
            Aucun mot de passe à retenir avec Google ou Facebook : ils
            s&apos;occupent de tout.
          </p>
        </Carte>
      ) : (
        <Carte className="space-y-4">
          <p className="text-lg font-bold">Avec ton email :</p>
          <div>
            <label htmlFor="email" className="block font-bold mb-1">
              Ton adresse email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom@exemple.fr"
              className="w-full min-h-[56px] px-4 rounded-lg border-4 border-sable bg-parchemin-2 text-lg"
            />
          </div>
          <div>
            <label htmlFor="mdp" className="block font-bold mb-1">
              Ton mot de passe
            </label>
            <input
              id="mdp"
              type="password"
              value={mdp}
              onChange={(e) => setMdp(e.target.value)}
              placeholder="6 caractères minimum"
              className="w-full min-h-[56px] px-4 rounded-lg border-4 border-sable bg-parchemin-2 text-lg"
            />
          </div>
          {message && (
            <p className="text-base font-bold text-azur">{message}</p>
          )}
          <Bouton
            variante="primaire"
            pleineLargeur
            onClick={connexionEmail}
            disabled={chargement}
          >
            {chargement ? "Un instant…" : "Se connecter / Créer mon compte"}
          </Bouton>
          <button
            className="underline font-bold"
            onClick={() => setMode("choix")}
          >
            Retour aux autres méthodes
          </button>
        </Carte>
      )}

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
