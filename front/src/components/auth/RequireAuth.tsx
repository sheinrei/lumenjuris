import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUserStore } from "../../store/userStore";

interface RequireAuthProps {
  children: ReactNode;
}

/**
 * Fonction de sécurisation des routes protègeant contre les accès non authentifiés.
 * À placer en tant que wrapper autour des `<Route>` ou des pages à protéger.
 *
 * **Comportement selon `authStatus`** :
 * - `"idle"` / `"loading"` → affiche un écran de chargement plein écran pour
 *   éviter le flash de la page de connexion pendant la vérification du cookie JWT.
 * - `"unauthenticated"` → redirige vers `/inscription` via `<Navigate replace>`.
 *   Le chemin courant est sauvegardé dans `location.state.from` pour permettre
 *   un retour automatique après connexion.
 * - `"authenticated"` → rend `children` normalement.
 *
 * @example
 * ```tsx
 * <Route
 *   path="/dashboard"
 *   element={
 *     <RequireAuth>
 *       <Dashboard />
 *     </RequireAuth>
 *   }
 * />
 * ```
 *
 * @param children Contenu à afficher si l'utilisateur est authentifié.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const authStatus = useUserStore((state) => state.authStatus);
  const location = useLocation();

  if (authStatus === "idle" || authStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Chargement…</div>
      </div>
    );
  }

  if (authStatus === "unauthenticated") {
    return (
      <Navigate to="/inscription" replace state={{ from: location.pathname }} />
    );
  }

  return <>{children}</>;
}
