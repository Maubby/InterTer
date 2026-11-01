"use client";

// Outils des duels entre amis : partage du lien, et retour au duel après la
// connexion (un ami invité qui n'a pas de compte doit retomber sur son duel).

const CLE_RETOUR = "interter_retour";

export function lienDuel(code: string): string {
  return `${window.location.origin}/duel/${code}`;
}

// Score du joueur qui invite, pour piquer l'ami au vif
export type ScoreInvitation = { score: number; total: number } | null;

export function messageInvitation(code: string, score: ScoreInvitation = null): string {
  const defi = score
    ? `J'ai fait ${score.score}/${score.total} au duel Interter, fais mieux que moi !`
    : "Je te défie sur Interter !";
  return `${defi} 5 questions sur nos villes de France, à jouer quand tu veux : ${lienDuel(code)}`;
}

// Le téléphone sait-il partager (feuille WhatsApp, SMS, Messenger…) ?
export function partageNatifDisponible(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

// Partage natif (téléphone) si disponible, sinon copie dans le presse-papiers.
// Renvoie « partage », « annule », « copie » ou « echec ».
export async function partagerDuel(
  code: string,
  score: ScoreInvitation = null
): Promise<"partage" | "annule" | "copie" | "echec"> {
  const texte = messageInvitation(code, score);
  if (partageNatifDisponible()) {
    try {
      await navigator.share({ title: "Duel Interter", text: texte });
      return "partage";
    } catch {
      return "annule"; // le joueur a refermé la feuille de partage
    }
  }
  try {
    await navigator.clipboard.writeText(texte);
    return "copie";
  } catch {
    return "echec";
  }
}

export function lienWhatsApp(code: string, score: ScoreInvitation = null): string {
  return `https://wa.me/?text=${encodeURIComponent(messageInvitation(code, score))}`;
}

export function lienSms(code: string, score: ScoreInvitation = null): string {
  return `sms:?&body=${encodeURIComponent(messageInvitation(code, score))}`;
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
