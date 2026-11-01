"use client";

// Outils des duels entre amis : partage du lien, et retour au duel après la
// connexion (un ami invité qui n'a pas de compte doit retomber sur son duel).

const CLE_RETOUR = "interter_retour";

export function lienDuel(code: string): string {
  return `${window.location.origin}/duel/${code}`;
}

export function messageInvitation(code: string): string {
  return `Je te défie sur Interter ! 5 questions sur nos villes de France, à jouer quand tu veux : ${lienDuel(code)}`;
}

// Partage natif (téléphone) si disponible, sinon copie dans le presse-papiers.
// Renvoie « partage », « copie » ou « echec ».
export async function partagerDuel(code: string): Promise<"partage" | "copie" | "echec"> {
  const texte = messageInvitation(code);
  if (navigator.share) {
    try {
      await navigator.share({ title: "Duel Interter", text: texte });
      return "partage";
    } catch {
      // partage annulé : on retombe sur la copie
    }
  }
  try {
    await navigator.clipboard.writeText(texte);
    return "copie";
  } catch {
    return "echec";
  }
}

export function lienWhatsApp(code: string): string {
  return `https://wa.me/?text=${encodeURIComponent(messageInvitation(code))}`;
}

export function lienSms(code: string): string {
  return `sms:?&body=${encodeURIComponent(messageInvitation(code))}`;
}

// Page où revenir après la connexion (seulement une adresse interne)
export function memoriserRetour(chemin: string) {
  try {
    if (chemin.startsWith("/")) localStorage.setItem(CLE_RETOUR, chemin);
  } catch {
    // stockage indisponible : le joueur retrouvera son lien
  }
}

export function reprendreRetour(): string | null {
  try {
    const chemin = localStorage.getItem(CLE_RETOUR);
    localStorage.removeItem(CLE_RETOUR);
    return chemin && chemin.startsWith("/") && !chemin.startsWith("//") ? chemin : null;
  } catch {
    return null;
  }
}
