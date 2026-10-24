// Générateur de pseudos « à la française chaleureuse » pour Interter.
// Prénoms et noms courts, faciles à lire, ton Intervilles.
// Ex : « Jacques Beauregard », « Margot Lefèvre »

const PRENOMS = [
  "Jacques", "Margot", "Jean", "Huguette", "Marcel", "Simone", "Robert",
  "Yvette", "Fernand", "Colette", "Gaston", "Madeleine", "Maurice",
  "Geneviève", "Léon", "Suzanne", "Henri", "Denise", "Émile", "Camille",
  "André", "Jeannine", "Pierre", "Paulette", "Georges", "Monique",
  "Raymond", "Lucienne", "Albert", "Bernadette", "Victor", "Adèle",
];

const NOMS = [
  "Beauregard", "Lefèvre", "Dupont", "Marchand", "Lavigne", "Boulanger",
  "Charpentier", "Berger", "Moreau", "Renaud", "Fontaine", "Clairval",
  "Dubois", "Cordier", "Lemoine", "Rousseau", "Bonnet", "Chevalier",
  "Perrin", "Girard", "Vermeil", "Roussel", "Colin", "Maillard",
  "Delacroix", "Aubert", "Sarrazin", "Bellec", "Trévise", "Rivière",
];

/** Renvoie un pseudo complet aléatoire, ex. « Jacques Beauregard ». */
export function pseudoAleatoire(): string {
  const p = PRENOMS[Math.floor(Math.random() * PRENOMS.length)];
  const n = NOMS[Math.floor(Math.random() * NOMS.length)];
  return `${p} ${n}`;
}

/**
 * Pseudo proposé par défaut à tous les nouveaux joueurs :
 * « Jacques Beauregard » — clin d'œil au sketch des Inconnus
 * sur les publicitaires (le nom de candidat « qui sonne bien »).
 * Le joueur peut bien sûr le modifier librement.
 */
export function pseudoPropose(): string {
  return "Jacques Beauregard";
}
