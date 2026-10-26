"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

// En-tête commun : logo + navigation + état de connexion.
// Affiche le pseudo du joueur connecté, ou un bouton Connexion.
export default function Header() {
  const supabase = getSupabaseBrowserClient();
  const [pseudo, setPseudo] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  // Qui est connecté ? (écoute aussi les changements de session)
  useEffect(() => {
    async function verifier() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profil } = await supabase
          .from("profiles")
          .select("pseudo")
          .eq("id", user.id)
          .single();
        setPseudo(profil?.pseudo ?? "Joueur");
      } else {
        setPseudo(null);
      }
      setChargement(false);
    }
    verifier();
    // Réagit aux connexions/déconnexions
    const { data: listener } = supabase.auth.onAuthStateChange(verifier);
    return () => listener.subscription.unsubscribe();
  }, []);

  async function deconnexion() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <header className="border-b-4 border-sable/40 bg-parchemin/60 sticky top-0 z-40">
      <div className="mx-auto max-w-5xl px-4 py-2 flex items-center gap-3">
        <Link href="/" aria-label="Interter — retour à l'accueil" className="flex items-center gap-3">
          <Image
            src="/logo/logo-officiel.png"
            alt="Interter — le Tournoi des Villes de France"
            width={1672}
            height={941}
            style={{ height: "94px", width: "auto" }}
            className="drop-shadow"
            priority
          />
        </Link>
        <nav className="ml-auto flex items-center gap-4 text-base font-bold">
          <Link href="/defi-du-jour" className="hover:text-gueules transition-colors">
            Quête du Jour
          </Link>
          <Link href="/essai" className="hover:text-gueules transition-colors">
            Essai
          </Link>
          <Link href="/mon-profil" className="hover:text-gueules transition-colors">
            Mon profil
          </Link>

          {/* État de connexion */}
          {!chargement && pseudo && (
            <span className="flex items-center gap-2 border-l-2 border-sable/30 pl-4">
              <span className="text-sable/80 hidden md:inline">{pseudo}</span>
              <button
                onClick={deconnexion}
                className="text-sable/70 hover:text-gueules underline transition-colors"
              >
                Déconnexion
              </button>
            </span>
          )}
          {!chargement && !pseudo && (
            <Link
              href="/connexion"
              className="bg-gueules text-white px-3 py-1.5 rounded-lg border-2 border-sable shadow-enchere active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
            >
              Connexion
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
