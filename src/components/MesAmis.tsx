"use client";

// « Mes amis » : un bouton Défier à côté de chaque nom, l'ajout d'un ami par
// son pseudo, et (sur Android) le défi d'un contact du téléphone.

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import {
  choisirContact,
  contactsDisponibles,
  lienSmsVers,
  lienWhatsAppVers,
} from "@/lib/duel";
import { Bouton } from "@/components/Bouton";
import { Carte } from "@/components/Carte";
import { Epees } from "@/components/Icons";

type Ami = { id: string; pseudo: string; ville: string | null };
type Trouve = Ami & { deja_ami: boolean };

// Médaillon à l'initiale du pseudo
function Initiale({ pseudo }: { pseudo: string }) {
  return (
    <span
      aria-hidden="true"
      className="lettre-choix shrink-0"
      style={{ width: "2.6rem", height: "2.6rem" }}
    >
      {pseudo.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function MesAmis() {
  const supabase = getSupabaseBrowserClient();
  const [amis, setAmis] = useState<Ami[] | null>(null);
  const [recherche, setRecherche] = useState("");
  const [trouves, setTrouves] = useState<Trouve[]>([]);
  const [enCours, setEnCours] = useState<string | null>(null); // id en cours d'action
  const [erreur, setErreur] = useState<string | null>(null);
  const [avecContacts, setAvecContacts] = useState(false);
  // Défi d'un contact du téléphone : duel créé, reste à choisir WhatsApp ou SMS
  const [contact, setContact] = useState<{ nom: string; tel: string; code: string } | null>(null);

  async function chargerAmis() {
    const { data } = await supabase.rpc("list_friends");
    setAmis((data as Ami[]) ?? []);
  }

  useEffect(() => {
    (async () => {
      setAvecContacts(contactsDisponibles());
      await chargerAmis();
    })();
    // chargerAmis ne dépend que du client Supabase, unique
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recherche de joueurs par pseudo, 250 ms après la dernière frappe
  useEffect(() => {
    const q = recherche.trim();
    const t = setTimeout(async () => {
      if (q.length < 2) {
        setTrouves([]);
        return;
      }
      const { data } = await supabase.rpc("search_players", { p_query: q });
      setTrouves((data as Trouve[]) ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [recherche, supabase]);

  async function defier(ami: Ami) {
    setEnCours(ami.id);
    setErreur(null);
    const { data, error } = await supabase.rpc("challenge_friend", { p_friend: ami.id });
    if (error || !data) {
      setErreur(error?.message ?? "Impossible de lancer le défi");
      setEnCours(null);
      return;
    }
    // On joue d'abord sa manche ; l'ami verra le défi à sa prochaine visite
    window.location.href = `/duel/${data}`;
  }

  async function ajouter(joueur: Trouve) {
    setEnCours(joueur.id);
    const { error } = await supabase.rpc("add_friend", { p_friend: joueur.id });
    setEnCours(null);
    if (error) {
      setErreur(error.message);
      return;
    }
    setRecherche("");
    setTrouves([]);
    await chargerAmis();
  }

  async function retirer(ami: Ami) {
    if (!window.confirm(`Retirer ${ami.pseudo} de tes amis ?`)) return;
    await supabase.rpc("remove_friend", { p_friend: ami.id });
    await chargerAmis();
  }

  async function defierContact() {
    setErreur(null);
    const choisi = await choisirContact();
    if (!choisi) return;
    setEnCours("contact");
    const { data, error } = await supabase.rpc("create_duel");
    setEnCours(null);
    if (error || !data) {
      setErreur(error?.message ?? "Impossible de lancer le défi");
      return;
    }
    setContact({ ...choisi, code: data as string });
  }

  return (
    <section className="space-y-4">
      {erreur && <p className="text-gueules font-bold text-center">{erreur}</p>}

      {/* Défi d'un contact : envoyer, puis jouer sa manche */}
      {contact && (
        <Carte className="space-y-3 text-center">
          <p className="text-lg">
            Envoie le défi à <strong>{contact.nom}</strong> :
          </p>
          <div className="grid grid-cols-2 gap-3">
            <a
              href={lienWhatsAppVers(contact.tel, contact.code)}
              target="_blank"
              rel="noopener noreferrer"
              className="choix justify-center"
              style={{ animation: "none" }}
            >
              WhatsApp
            </a>
            <a
              href={lienSmsVers(contact.tel, contact.code)}
              className="choix justify-center"
              style={{ animation: "none" }}
            >
              SMS
            </a>
          </div>
          <Bouton
            variante="succes"
            pleineLargeur
            onClick={() => (window.location.href = `/duel/${contact.code}`)}
          >
            <Epees className="w-6 h-6" /> Puis jouer ma manche
          </Bouton>
        </Carte>
      )}

      {/* La liste */}
      {amis === null ? (
        <p className="text-center">Chargement de tes amis…</p>
      ) : amis.length === 0 ? (
        <p className="text-sable/70">
          Pas encore d&apos;amis ici. Ajoute-les par leur pseudo ci-dessous : et
          quiconque joue l&apos;un de tes duels devient ton ami automatiquement.
        </p>
      ) : (
        <ul className="space-y-3">
          {amis.map((ami) => (
            <li
              key={ami.id}
              className="flex items-center gap-3 rounded-lg border-4 border-sable bg-white px-3 py-2"
              style={{ boxShadow: "4px 4px 0 var(--color-sable)" }}
            >
              <Initiale pseudo={ami.pseudo} />
              <span className="min-w-0 flex-1">
                <span className="block font-bold truncate">{ami.pseudo}</span>
                <span className="block text-sm text-sable/60 truncate">
                  {ami.ville ?? "Ville inconnue"}
                  {" · "}
                  <button className="underline" onClick={() => retirer(ami)}>
                    retirer
                  </button>
                </span>
              </span>
              <Bouton
                variante="primaire"
                className="!min-h-[48px] !px-4 shrink-0"
                disabled={enCours !== null}
                onClick={() => defier(ami)}
              >
                <Epees className="w-5 h-5" /> {enCours === ami.id ? "…" : "Défier"}
              </Bouton>
            </li>
          ))}
        </ul>
      )}

      {/* Ajouter un ami par son pseudo */}
      <div className="space-y-2">
        <label htmlFor="ajout-ami" className="block font-bold">
          Ajouter un ami
        </label>
        <input
          id="ajout-ami"
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Son pseudo…"
          className="w-full min-h-[56px] px-4 rounded-lg border-4 border-sable bg-parchemin-2 text-lg"
          autoComplete="off"
        />
        {recherche.trim().length >= 2 && (
          <ul className="space-y-2">
            {trouves.length === 0 && (
              <li className="text-sable/70">Aucun joueur ne porte ce pseudo.</li>
            )}
            {trouves.map((j) => (
              <li
                key={j.id}
                className="flex items-center gap-3 rounded-lg border-2 border-sable/40 bg-parchemin px-3 py-2"
              >
                <Initiale pseudo={j.pseudo} />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold truncate">{j.pseudo}</span>
                  {j.ville && <span className="block text-sm text-sable/60 truncate">{j.ville}</span>}
                </span>
                {j.deja_ami ? (
                  <span className="note-ancienne text-sinople">Déjà ami</span>
                ) : (
                  <Bouton
                    variante="succes"
                    className="!min-h-[44px] !px-4 shrink-0"
                    disabled={enCours !== null}
                    onClick={() => ajouter(j)}
                  >
                    Ajouter
                  </Bouton>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Android : défier un contact du téléphone */}
      {avecContacts && (
        <Bouton
          variante="secondaire"
          pleineLargeur
          disabled={enCours !== null}
          onClick={defierContact}
        >
          Défier un contact du téléphone
        </Bouton>
      )}
    </section>
  );
}
