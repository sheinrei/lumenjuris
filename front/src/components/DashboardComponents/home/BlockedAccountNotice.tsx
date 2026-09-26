import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { AlertBanner } from "../../common/AlertBanner";

/**
 * Message affiché quand un compte bloqué tente de se connecter.
 *
 * La connexion par Google se fait hors de l'application : le serveur ne peut
 * que rediriger, il renvoie donc vers l'accueil avec `?error=banned`. Comme le
 * panneau de connexion n'est pas ouvert au retour, c'est l'accueil qui porte
 * ce message — le panneau, lui, garde son propre message pour le refus reçu au
 * moment d'une connexion par e-mail.
 *
 * Le paramètre est retiré de l'URL dès qu'il est lu : sans cela, le message
 * reviendrait à chaque rechargement et l'adresse resterait partageable en
 * l'état.
 */
export function BlockedAccountNotice() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [compteBloque, setCompteBloque] = useState(false);

  useEffect(() => {
    // Les deux noms existent selon la route d'origine côté serveur.
    const estBloque =
      searchParams.get("error") === "banned" ||
      searchParams.get("reason") === "banned";

    if (!estBloque) return;

    setCompteBloque(true);

    const parametresNettoyes = new URLSearchParams(searchParams);
    parametresNettoyes.delete("error");
    parametresNettoyes.delete("reason");
    setSearchParams(parametresNettoyes, { replace: true });
  }, [searchParams, setSearchParams]);

  if (!compteBloque) return null;

  return (
    <AlertBanner
      title="Votre compte a été bloqué"
      variant="error"
      detail="Votre compte a été bloqué par les services de modération. Si vous ne comprenez pas les raisons, vous pouvez nous contacter par e-mail à l'adresse contact@lumenjuris.com"
      duration={15000}
      onClose={() => setCompteBloque(false)}
    />
  );
}
