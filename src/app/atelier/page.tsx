"use client";

// L'atelier : réservé aux comptes admin (profiles.is_admin). On y joue
// n'importe quelle épreuve de la banque, autant de fois qu'on veut, sans
// toucher aux points, à la série ni à la Quête du Jour : la correction passe
// par check_practice_item, qui n'enregistre rien.

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Carte, Titre } from "@/components/Carte";
import { Bouton } from "@/components/Bouton";
import { Verdict } from "@/components/Jeu";
import { Epreuve, HoteEpreuve, useCorrection, type Item } from "@/components/Epreuves";
import { GUILDE } from "@/lib/guilde";

export default function Atelier() {
  const supabase = getSupabaseBrowserClient();
  const correction = useCorrection(supabase);
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [filtre, setFiltre] = useState("tous");
  const [choisi, setChoisi] = useState<Item | null>(null);
  const [partie, setPartie] = useState(0); // change à chaque « Rejouer »

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setAdmin(false);
      const { data: profil } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
      if (!profil?.is_admin) return setAdmin(false);
      setAdmin(true);
      const { data } = await supabase.from("game_items").select("id, game_type, theme, payload").eq("is_active", true);
      setItems((data as Item[]) ?? []);
    })();
  }, [supabase]);

  if (admin === null) return <p className="p-6">…</p>;
  if (!admin) {
    return (
      <main className="max-w-xl mx-auto p-4">
        <Carte>Cette page est réservée aux comptes admin.</Carte>
      </main>
    );
  }

  const familles = [...new Set(items.map((i) => i.theme ?? i.game_type))].sort();
  const visibles = items.filter((i) => filtre === "tous" || (i.theme ?? i.game_type) === filtre);
  const intitule = (i: Item) =>
    i.payload.question ?? i.payload.riddle ?? i.payload.statement ?? i.payload.emojis ?? i.payload.title ?? i.game_type;

  if (choisi) {
    const hote = GUILDE[choisi.theme ?? choisi.game_type];
    const repondu = correction.verdict !== null;
    return (
      <main className="max-w-xl mx-auto p-4 space-y-4">
        <Bouton variante="secondaire" onClick={() => { correction.suivante(); setChoisi(null); }}>
          ← Retour à la liste
        </Bouton>
        <Carte className="space-y-4">
          <HoteEpreuve key={choisi.id} hote={hote} reponseDonnee={repondu} bonneReponse={correction.verdict} />
          {/* key : rejouer la même épreuve repart de zéro */}
          <Epreuve
            key={`${choisi.id}-${partie}`}
            item={choisi}
            onValider={(a) => correction.noter(choisi, a)}
            desactive={correction.enCours || repondu}
            verdict={correction.verdict}
            rate={correction.rate}
            eliminees={correction.eliminees}
            onJoker={correction.jokerDispo ? () => correction.joker(choisi) : undefined}
          />
          {repondu && (
            <>
              <Verdict juste={correction.verdict === true} points={correction.points} />
              {choisi.payload.explanation && <p className="glose">{choisi.payload.explanation}</p>}
              <Bouton pleineLargeur onClick={() => { correction.suivante(); setPartie(partie + 1); }}>
                Rejouer cette épreuve
              </Bouton>
            </>
          )}
        </Carte>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-4">
      <Titre>L&apos;atelier</Titre>
      <p>
        {items.length} épreuves. Rien de ce qui se joue ici ne compte pour les points ni la Quête du Jour.
      </p>
      <div className="flex flex-wrap gap-2">
        {["tous", ...familles].map((f) => (
          <button
            key={f}
            onClick={() => setFiltre(f)}
            className={`px-3 py-1 rounded-lg border-2 border-sable font-bold ${filtre === f ? "bg-gueules text-white" : "bg-parchemin-2"}`}
          >
            {f === "tous" ? "Toutes" : GUILDE[f]?.nom ?? f} ({f === "tous" ? items.length : items.filter((i) => (i.theme ?? i.game_type) === f).length})
          </button>
        ))}
      </div>
      <ul className="space-y-2">
        {visibles.map((i) => (
          <li key={i.id}>
            <button
              onClick={() => { correction.suivante(); setChoisi(i); }}
              className="w-full text-left px-4 py-3 rounded-lg border-2 border-sable bg-parchemin-2 hover:bg-parchemin"
            >
              <span className="text-sm text-sable/70">{i.game_type}</span>
              <br />
              {String(intitule(i))}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
