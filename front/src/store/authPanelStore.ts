import { create } from "zustand";

/** Panneau d'authentification actuellement ouvert dans l'en-tête. */
type PanneauAuth = "aucun" | "connexion" | "inscription";

interface State {
  panneau: PanneauAuth;
  /**
   * Page que l'utilisateur voulait ouvrir avant qu'on lui demande de se
   * connecter. On l'y emmène une fois la connexion réussie, au lieu de le
   * laisser sur l'accueil à devoir recliquer.
   */
  destination: string | null;
  ouvrirConnexion: (destination?: string) => void;
  ouvrirInscription: (destination?: string) => void;
  /**
   * Passe d'un panneau à l'autre en gardant la destination : un visiteur qui
   * clique sur un module puis choisit de créer un compte doit tout de même
   * arriver sur le module une fois inscrit et connecté.
   */
  basculerVers: (panneau: "connexion" | "inscription") => void;
  fermer: () => void;
}

/**
 * État partagé des panneaux de connexion et d'inscription.
 *
 * Ils sont rendus par l'en-tête, mais peuvent être ouverts depuis n'importe où
 * — l'accueil demande la connexion au moment où un visiteur ouvre un module.
 * Un seul panneau est visible à la fois : ils se superposeraient au même
 * endroit de l'écran.
 */
export const useAuthPanelStore = create<State>((set) => ({
  panneau: "aucun",
  destination: null,
  ouvrirConnexion: (destination) =>
    set({ panneau: "connexion", destination: destination ?? null }),
  ouvrirInscription: (destination) =>
    set({ panneau: "inscription", destination: destination ?? null }),
  basculerVers: (panneau) => set({ panneau }),
  fermer: () => set({ panneau: "aucun", destination: null }),
}));
