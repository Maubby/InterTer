"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { pseudoAleatoire, pseudoPropose } from "@/lib/pseudo";
import { Bouton } from "@/components/Bouton";
import { Carte, Titre } from "@/components/Carte";

type Ville = {
  id: string;
  name: string;
  department_name: string;
  region_name: string;
  postal_code?: string | null;
};

// Écran obligatoire de choix de la ville (après OAuth).
// Autocomplétion : recherche par préfixe, insensible aux accents.
export default function PageChoisirMaVille() {
  const supabase = getSupabaseBrowserClient();
  const [recherche, setRecherche] = useState("");
  const [villes, setVilles] = useState<Ville[]>([]);
  const [choisie, setChoisie] = useState<Ville | null>(null);
  const [pseudo, setPseudo] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  // Pseudo pré-rempli : partie locale de l'email (récupéré à l'affichage)
  const [pseudoDefaut, setPseudoDefaut] = useState("");

  // Pré-remplit le pseudo dès la connexion détectée :
  // pseudo à consonance française, JAMAIS l'email (vie privée)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setPseudoDefaut(pseudoPropose());
    });
  }, []);

  // Normalisation : minuscules + suppression des accents
  function sansAccents(s: string): string {
    return s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  // Recherche des villes (autocomplétion) dès que l'utilisateur tape ≥ 2 caractères
  // Accepte : un NOM ("bois", "Paris") OU un CODE POSTAL ("87220", "87")
  useEffect(() => {
    if (recherche.trim().length < 2 || choisie) {
      setVilles([]);
      return;
    }
    const t = setTimeout(async () => {
      const q = recherche.trim();
      const estCodePostal = /^\d+$/.test(q); // que des chiffres = code postal
      let requete = supabase
        .from("cities")
        .select("id, name, department_name, region_name, population, postal_code")
        .order("population", { ascending: false, nullsFirst: false })
        .limit(8);
      if (estCodePostal) {
        requete = requete.like("postal_code", `${q}%`);
      } else {
        requete = requete.ilike("name", `${q}%`);
      }
      const { data, error } = await requete;
      if (error) {
        console.error(error);
        return;
      }
      setVilles((data as Ville[]) ?? []);
    }, 200); // anti-spam : 200 ms après la dernière frappe
    return () => clearTimeout(t);
  }, [recherche, choisie]);

  async function valider() {
    if (!choisie) return;
    setChargement(true);
    setErreur(null);

    // Récupère l'utilisateur connecté
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErreur("Tu n'es pas connecté — retourne à l'accueil pour te connecter.");
      setChargement(false);
      return;
    }

    // Pseudo : celui choisi par le joueur, sinon le pseudo proposé
    const pseudoFinal = pseudo.trim() || pseudoDefaut || pseudoAleatoire();

    // Crée le profil (1re connexion) ou le met à jour
    const { error: errProfil } = await supabase.from("profiles").upsert({
      id: user.id,
      pseudo: pseudoFinal,
      city_id: choisie.id,
    });
    if (errProfil) {
      setErreur(errProfil.message);
      setChargement(false);
      return;
    }

    setOk(true);
    setChargement(false);
  }

  // Écran de confirmation
  if (ok && choisie) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 space-y-6 text-center">
        <Titre>Bienvenue à {choisie.name} !</Titre>
        <Carte className="space-y-3">
          <p className="text-lg">
            Ton terter est maintenant <strong>{choisie.name}</strong> (
            {choisie.department_name}).
          </p>
          <p>
            Chaque bonne réponse fera monter ta ville dans le classement
            national. Reviens chaque jour pour le Défi du Jour !
          </p>
          <Bouton variante="primaire" pleineLargeur onClick={() => (window.location.href = "/")}>
            Retour à l&apos;accueil
          </Bouton>
        </Carte>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <header className="space-y-2">
        <Titre>Pour quelle ville joues-tu ?</Titre>
        <p className="text-lg">
          Ta commune, ton quartier, ton village d&apos;enfance… choisis le
          terter que tu veux faire briller !
        </p>
      </header>

      {/* Barre de recherche */}
      <div>
        <input
          type="text"
          value={recherche}
          onChange={(e) => {
            setRecherche(e.target.value);
            setChoisie(null);
          }}
          placeholder="Nom de ta ville ou code postal…"
          className="w-full min-h-[56px] px-4 rounded-lg border-4 border-sable bg-parchemin-2 text-lg"
          aria-label="Rechercher une ville"
        />
        {recherche.length >= 2 && !choisie && (
          <ul className="mt-2 border-4 border-sable rounded-lg bg-white shadow-enchere overflow-hidden">
            {villes.length === 0 && (
              <li className="p-3 text-sable/70">
                Aucune ville trouvée. Essaie un autre nom.
              </li>
            )}
            {villes.map((v) => (
              <li key={v.id}>
                <button
                  onClick={() => setChoisie(v)}
                  className="w-full text-left px-4 py-3 hover:bg-or/30 transition-colors border-b-2 border-sable/10 last:border-b-0"
                >
                  <span className="font-bold text-lg">{v.name}</span>
                  <span className="block text-sm text-sable/60">
                    {v.postal_code ? `${v.postal_code} · ` : ""}
                    {v.department_name} — {v.region_name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Ville choisie + pseudo */}
      {choisie && (
        <Carte className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-xl">{choisie.name}</p>
              <p className="text-sable/60">
                {choisie.department_name} — {choisie.region_name}
              </p>
            </div>
            <button
              onClick={() => {
                setChoisie(null);
                setRecherche("");
              }}
              className="text-gueules font-bold underline"
            >
              Changer
            </button>
          </div>

          <div>
            <label htmlFor="pseudo" className="block font-bold mb-1">
              Ton pseudo (facultatif)
            </label>
            <input
              id="pseudo"
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder={pseudoDefaut || "TonPseudo"}
              className="w-full min-h-[48px] px-4 rounded-lg border-4 border-sable bg-parchemin-2 text-lg"
              maxLength={30}
            />
          </div>

          {erreur && (
            <p className="text-gueules font-bold">{erreur}</p>
          )}

          <Bouton variante="succes" pleineLargeur onClick={valider} disabled={chargement}>
            {chargement ? "Enregistrement…" : `Je défends ${choisie.name} !`}
          </Bouton>
        </Carte>
      )}
    </main>
  );
}
