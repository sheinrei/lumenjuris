/**
 * Bouton « Continuer avec Microsoft ».
 *
 * La connexion Microsoft n'est pas encore branchée côté serveur : le bouton
 * n'est là que pour la mise en page, et reste désactivé tant que la route
 * d'authentification n'existe pas. On le dit explicitement à l'utilisateur
 * plutôt que de laisser un clic sans effet.
 */
export const ConnectMicrosoft = () => {
  return (
    <button
      type="button"
      disabled
      title="La connexion Microsoft arrive bientôt"
      className="inline-flex h-10 w-full cursor-not-allowed items-center justify-center gap-2 rounded-md border border-line text-sm font-medium text-ink-muted"
    >
      <LogoMicrosoft />
      Continuer avec Microsoft
      <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
        Bientôt
      </span>
    </button>
  );
};

/** Les quatre carrés du logo Microsoft, aux couleurs de la marque. */
function LogoMicrosoft() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-[15px] w-[15px]"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="0" y="0" width="7" height="7" fill="#F25022" />
      <rect x="9" y="0" width="7" height="7" fill="#7FBA00" />
      <rect x="0" y="9" width="7" height="7" fill="#00A4EF" />
      <rect x="9" y="9" width="7" height="7" fill="#FFB900" />
    </svg>
  );
}
