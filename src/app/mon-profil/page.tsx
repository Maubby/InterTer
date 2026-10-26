"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Bouton } from "@/components/Bouton";
import { Carte, Titre } from "@/components/Carte";
import { Separateur } from "@/components/Fioritures";
import { Flamme, Trophee, Etoile } from "@/components/Icons";

// ---------- Types ----------
type Profil = {
  pseudo: string;
  city_id: string | null;
  streak: number;
  last_play_date: string | null;
  is_supporter: boolean;
};
type MaVille = { name: string; department_name: string; region_name: string };
type MesPoints = { total_points: number; play_count: number } | null;
type MonBadge = { badge_code: string; earned_at: string };
type BadgeInfo = { code: string; label: string; description: string; icon: string };

export default function PageMonProfil() {
  const supabase = getSupabaseBrowserClient();
  const [connecte, setConnecte] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [maVille, setMaVille] = useState<MaVille | null>(null);
  const [mesPoints, setMesPoints] = useState<MesPoints>(null);
  const [mesQuetes, setMesQuetes] = useState<number>(0);
  const [mesBadges, setMesBadges] = useState<(MonBadge & BadgeInfo)[]>([]);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setConnecte(false);
        setChargement(false);
        return;
      }
      setConnecte(true);

      // Profil
      const { data: p } = await supabase
        .from("profiles")
        .select("pseudo, city_id, streak, last_play_date, is_supporter")
        .eq("id", user.id)
        .single();
      if (p) {
        setProfil(p as Profil);
        // Sa ville
        if (p.city_id) {
          const { data: v } = await supabase
            .from("cities")
            .select("name, department_name, region_name")
            .eq("id", p.city_id)
            .single();
          if (v) setMaVille(v as MaVille);
        }
      }

      // Ses quêtes jouées (total de participations)
      const { count } = await supabase
        .from("daily_plays")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      setMesQuetes(count ?? 0);

      // Les points de sa ville (contribution collective)
      if (p?.city_id) {
        const { data: cs } = await supabase
          .from("city_scores")
          .select("total_points, play_count")
          .eq("city_id", p.city_id)
          .single();
        if (cs) setMesPoints(cs as MesPoints);
      }

      // Ses badges
      const { data: ub } = await supabase
        .from("user_badges")
        .select("badge_code, earned_at")
        .eq("user_id", user.id);
      if (ub && ub.length > 0) {
        const { data: bInfos } = await supabase
          .from("badges")
          .select("code, label, description, icon");
        const fusion = ub.map((u: MonBadge) => ({
          ...u,
          ...((bInfos ?? []).find((b: BadgeInfo) => b.code === u.badge_code) as BadgeInfo),
        }));
        setMesBadges(fusion as (MonBadge & BadgeInfo)[]);
      }

      setChargement(false);
    })();
  }, []);

  // ---------- Pas connecté ----------
  if (!connecte && !chargement) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 space-y-6 text-center">
        <Titre>Mon Profil</Titre>
        <Carte className="space-y-4">
          <p className="text-lg">
            Connecte-toi pour voir ta série, tes badges et ta ville !
          </p>
          <Bouton
            variante="primaire"
            pleineLargeur
            onClick={() => (window.location.href = "/connexion")}
          >
            <Etoile className="w-6 h-6" /> Se connecter
          </Bouton>
        </Carte>
      </main>
    );
  }

  if (chargement) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 text-center">
        <p>Le héraut déroule ton parchemin…</p>
      </main>
    );
  }

  // ---------- Profil connecté ----------
  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <header className="text-center space-y-1">
        <Titre>{profil?.pseudo ?? "Joueur"}</Titre>
        {maVille && (
          <p className="text-lg">
            Défenseur de <strong>{maVille.name}</strong>
            <span className="block text-base text-sable/60">
              {maVille.department_name} — {maVille.region_name}
            </span>
          </p>
        )}
      </header>

      {/* Les 3 stats clés */}
      <div className="grid grid-cols-3 gap-3">
        <Carte className="text-center p-3">
          <Flamme className="w-8 h-8 mx-auto text-gueules" />
          <p className="font-cinzel font-black text-2xl mt-1">{profil?.streak ?? 0}</p>
          <p className="text-sm font-bold">série</p>
        </Carte>
        <Carte className="text-center p-3">
          <Trophee className="w-8 h-8 mx-auto text-or" />
          <p className="font-cinzel font-black text-2xl mt-1">{mesQuetes}</p>
          <p className="text-sm font-bold">quêtes</p>
        </Carte>
        <Carte className="text-center p-3">
          <Etoile className="w-8 h-8 mx-auto text-azur" />
          <p className="font-cinzel font-black text-2xl mt-1">{mesBadges.length}</p>
          <p className="text-sm font-bold">badges</p>
        </Carte>
      </div>

      <Separateur />

      {/* Ma ville dans le tournoi */}
      {maVille && mesPoints && (
        <Carte className="space-y-2">
          <p className="font-cinzel font-bold text-lg">
            {maVille.name} dans le tournoi
          </p>
          <div className="flex items-baseline gap-3">
            <p className="font-cinzel font-black text-3xl text-sinople">
              {mesPoints.total_points.toLocaleString("fr-FR")}
            </p>
            <p className="text-sable/70">points cumulés par la ville</p>
          </div>
          <p className="text-sm text-sable/60">
            dont les tiens, gagnés en Quête du Jour (×5) et en entraînement —
            chaque habitant compte !
          </p>
          <Bouton
            variante="enigme"
            pleineLargeur
            onClick={() => (window.location.href = "/classement")}
          >
            Voir le classement des villes
          </Bouton>
        </Carte>
      )}

      {/* Badges */}
      {mesBadges.length > 0 && (
        <Carte className="space-y-3">
          <p className="font-cinzel font-bold text-lg">Mes distinctions</p>
          <ul className="grid gap-2">
            {mesBadges.map((b) => (
              <li
                key={b.badge_code}
                className="flex items-center gap-3 border-2 border-sable/30 rounded-lg p-2"
              >
                <span className="text-2xl">{b.icon}</span>
                <div>
                  <p className="font-bold">{b.label}</p>
                  <p className="text-sm text-sable/60">{b.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </Carte>
      )}

      {/* Prochaine Quête */}
      <Bouton
        variante="primaire"
        pleineLargeur
        onClick={() => (window.location.href = "/defi-du-jour")}
      >
        <Flamme className="w-6 h-6" /> Vivre la Quête du Jour
      </Bouton>
    </main>
  );
}
