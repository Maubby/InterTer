import { Suspense } from "react";
import Duel from "./Duel";

// Le code du duel n'est connu qu'à la visite : avec cacheComponents,
// useParams doit être rendu sous un Suspense.
export default function PageDuel() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-lg px-4 py-8 text-center">Chargement du duel…</main>}>
      <Duel />
    </Suspense>
  );
}
