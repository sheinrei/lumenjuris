import { useEffect } from "react";
import { useLocation } from "react-router";

/**
 * Composant utilitaire sans rendu visuel (`return null`) à placer une seule fois
 * dans l'arbre de routage, idéalement juste avant ou après `<Routes>`.
 *
 * À chaque changement de `pathname`, il repositionne la fenêtre en haut de page
 * (`scrollTo top: 0`) de manière instantanée, reproduisant le comportement natif
 * d'un navigateur lors d'une navigation entre pages.
 *
 * @example
 * ```tsx
 * // Dans App.tsx, à l'intérieur de <BrowserRouter>
 * <ScrollToTop />
 * <Routes>
 *   <Route path="/" element={<Home />} />
 * </Routes>
 * ```
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
