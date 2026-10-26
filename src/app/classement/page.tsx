"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Carte, Titre } from "@/components/Carte";
import { RoseDesVents, Separateur } from "@/components/Fioritures";
import { Trophee, Bouclier } from "@/components/Icons";

// ---------- Types ----------
type LigneVille = {
  city_id: string;
  total_points: number;
  play_count: number;
  name: string;
  department_name: string;
  region_name: string;
};

export default function PageClassement() {
  const supabase = getSupabaseBrowserClient();
  const [vue, setVue] = useState<"national" | "departement" | "region">("national");
  const [lignes, setLignes] = useState<LigneVille[]>([]);
  const [chargement, setChargement] = useState(true);
  const [maVille, setMaVille] = useState<string | null>(null);

  // La ville du joueur connecté (pour la surligner)
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profil } = await supabase
        .from("profiles")
        .select("city_id")
        .eq("id", user.id)
        .single();
      if (profil?.city_id) setMaVille(profil.city_id);
    })();
  }, []);

  // Chargement du classement selon la vue
  useEffect(() => {
    (async () => {
      setChargement(true);
      let requete = supabase
        .from("city_scores")
        .select(
          "city_id, total_points, play_count, cities(name, department_name, region_name)"
        )
        .order("total_points", { ascending: false })
        .limit(50);

      // Filtre département / région : selon la ville du joueur
      if (vue !== "national" && maVille) {
        const { data: maVilleData } = await supabase
          .from("cities")
          .select("department_name, region_name")
          .eq("id", maVille)
          .single();
        if (maVilleData) {
          const champ = vue === "departement" ? "department_name" : "region_name";
          const valeur =
            vue === "departement"
              ? (maVilleData as any).department_name
              : (maVilleData as any).region_name;
          requete = requete.filter(`cities.${champ}`, "eq", valeur);
        }
      }

      const { data, error } = await requete;
      if (error) {
        console.error(error);
        setChargement(false);
        return;
      }
      // Aplatir les données des villes
      const resultat = (data ?? []).map((r: any) => ({
        city_id: r.city_id,
        total_points: r.total_points,
        play_count: r.play_count,
        name: r.cities?.name ?? "—",
        department_name: r.cities?.department_name ?? "",
        region_name: r.cities?.region_name ?? "",
      }));
      setLignes(resultat);
      setChargement(false);
    })();
  }, [vue, maVille]);

  // Médailles pour le podium : or/argent/bronze en pastilles (pas d'emoji)
  function medaille(i: number): { txt: string; coul: string } {
    if (i === 0) return { txt: "1er", coul: "bg-or text-sable" };
    if (i === 1) return { txt: "2e", coul: "bg-sable/70 text-parchemin" };
    if (i === 2) return { txt: "3e", coul: "bg-gueules/60 text-white" };
    return { txt: `${i + 1}e`, coul: "bg-parchemin-2 text-sable" };
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <header className="text-center space-y-2">
        <RoseDesVents taille={56} className="mx-auto text-or" />
        <Titre>Le Classement des Villes</Titre>
        <p className="text-lg">
          Chaque bonne réponse fait monter une commune. Où en est ta ville ?
        </p>
      </header>

      {/* Sélecteur de vue */}
      <div className="grid grid-cols-3 gap-2">
        {[
          ["national", "Toute la France"],
          ["departement", "Mon département"],
          ["region", "Ma région"],
        ].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setVue(val as any)}
            className={`min-h-[48px] rounded-lg border-4 text-sm font-bold transition-colors ${
              vue === val
                ? "bg-or border-sable"
                : "bg-parchemin-2 border-sable hover:bg-or/20"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Separateur />

      <Carte className="p-3">
        {chargement ? (
          <p className="text-center py-8">Les hérauts comptent les points…</p>
        ) : lignes.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <Bouclier className="w-12 h-12 mx-auto text-sable/40" />
            <p className="font-bold">
              Aucune ville n&apos;est encore inscrite au tournoi !
            </p>
            <p className="text-sable/70">
              Les premiers points tomberont dès la prochaine Quête du Jour.
            </p>
          </div>
        ) : (
          <ul className="divide-y-2 divide-sable/10">
            {lignes.map((l, i) => (
              <li
                key={l.city_id}
                className={`flex items-center gap-3 py-3 px-2 rounded-lg ${
                  l.city_id === maVille ? "bg-or/20 border-2 border-or" : ""
                }`}
              >
                <span
                  className={`font-cinzel font-black text-sm w-12 h-9 flex items-center justify-center rounded-md shrink-0 ${medaille(i).coul}`}
                >
                  {medaille(i).txt}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg truncate">{l.name}</p>
                  <p className="text-sm text-sable/60 truncate">
                    {l.department_name} — {l.region_name}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-cinzel font-black text-xl text-sinople">
                    {l.total_points.toLocaleString("fr-FR")}
                  </p>
                  <p className="text-xs text-sable/50">
                    {l.play_count} quête{l.play_count > 1 ? "s" : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Carte>

      {lignes.length > 0 && (
        <p className="text-center text-sm text-sable/60">
          Le classement compte tous les points gagnés en Quête du Jour (×5) et
          en épreuves locales.
        </p>
      )}
    </main>
  );
}
