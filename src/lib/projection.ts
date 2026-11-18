// Projection de la carte de France (public/carte/france.svg), partagée par le
// script qui la dessine et le jeu qui convertit un clic en latitude/longitude.
const LON_MIN = -5.3, LON_MAX = 9.7, LAT_MIN = 41.2, LAT_MAX = 51.2;
const COS = Math.cos((46.5 * Math.PI) / 180);
const ECHELLE = 60; // unités par degré de latitude

export const PROJECTION = {
  LON_MIN, LAT_MAX, ECHELLE, COS,
  LARGEUR: Math.round((LON_MAX - LON_MIN) * COS * ECHELLE),
  HAUTEUR: Math.round((LAT_MAX - LAT_MIN) * ECHELLE),
};

// Position dans la carte (fractions 0..1) → coordonnées, et l'inverse
export function versCoordonnees(fx: number, fy: number) {
  return {
    lat: LAT_MAX - (fy * PROJECTION.HAUTEUR) / ECHELLE,
    lon: LON_MIN + (fx * PROJECTION.LARGEUR) / (ECHELLE * COS),
  };
}
export function versCarte(lat: number, lon: number) {
  return {
    fx: ((lon - LON_MIN) * ECHELLE * COS) / PROJECTION.LARGEUR,
    fy: ((LAT_MAX - lat) * ECHELLE) / PROJECTION.HAUTEUR,
  };
}
