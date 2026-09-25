// UI //
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../ui/InputGroup";
import { Field, FieldLabel, FieldDescription } from "../ui/Field";
import {
  EyeOffIcon,
  EyeIcon,
  SendIcon,
  LogInIcon,
  MailIcon,
  PencilIcon,
  X,
} from "lucide-react";

import { AlertBanner } from "../common/AlertBanner";
import { TwoFactorCodeModal } from "../ui/TwoFactorCodeModal";
import { useUserStore } from "../../store/userStore";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";

import { fetchProxy } from "../../utils/fetchProxy";
import { ConnectGoogle } from "./ConnectGoogle";
import { ConnectMicrosoft } from "./ConnectMicrosoft";



interface LoginFormProps {
  /** Referme le panneau : croix, clic à côté, touche Échap, connexion réussie. */
  onClose: () => void;
  /** Bascule sur le panneau d'inscription, depuis le pied du formulaire. */
  onSwitchToSignup: () => void;
}

/**
 * Panneau de connexion affiché depuis l'en-tête, au moment où l'utilisateur a
 * besoin d'un compte. Il porte lui-même sa présentation : une carte flottante
 * ancrée sous le bouton « Se connecter », montée via un portail pour ne pas
 * déformer la barre de navigation.
 *
 * La connexion par e-mail se fait en deux étapes : on demande d'abord
 * l'adresse, puis seulement le mot de passe. L'adresse reste affichée à la
 * seconde étape, en lecture seule, avec un bouton « Changer d'email » pour
 * revenir en arrière.
 *
 * Il gère les trois flux d'authentification : e-mail / mot de passe (avec 2FA
 * et compte non vérifié), Google OAuth, et mot de passe oublié. Le bouton
 * Microsoft n'est qu'une maquette, sa route serveur n'existe pas encore.
 */
export const LoginForm = ({ onClose, onSwitchToSignup }: LoginFormProps) => {

  const [showPassword, setShowPassword] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [submitForgotError, setSubmitForgotError] = useState(false);
  const [serverError, setServerError] = useState(false);
  const [serverErrorMessage, setServerErrorMessage] = useState(
    "Une erreur est survenue, veuillez réessayer...",
  );
  const [isBanned, setIsBanned] = useState(false);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [twoFactorEmail, setTwoFactorEmail] = useState("");
  const [verificationError, setVerificationError] = useState(false);
  const verificationErrorMessage =
    "Pour valider votre compte veuillez cliquer sur le lien qui vous a été envoyé par e-mail.";

  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [showRateLimitLogin, setShowRateLimitLogin] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  const navigate = useNavigate();
  const { fetchUser } = useUserStore();
  const location = useLocation();
  const locationState = location.state as { plan?: object } | null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotPassword, setForgotPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // La connexion se fait en deux temps : on demande l'adresse, puis seulement
  // le mot de passe. L'adresse reste affichée à la seconde étape, en lecture,
  // pour que l'utilisateur voie sous quel compte il se connecte.
  const [etape, setEtape] = useState<"email" | "motDePasse">("email");


  // Retour à la saisie de l'adresse : on repose le curseur dans le champ, sans
  // quoi l'utilisateur devrait cliquer dedans pour corriger. Le champ est
  // retrouvé par son id : le composant Input partagé n'est pas un forwardRef,
  // une ref React ne l'atteindrait pas.
  useEffect(() => {
    if (etape === "email" && email) {
      document.getElementById("email")?.focus();
    }
  }, [etape]);

  // Échap referme le panneau, comme la croix.
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);



  useEffect(() => {
    setForgotPassword(false);
    setEmailSent(false);
    const errorParam = searchParams.get("error");
    const reasonParam = searchParams.get("reason");
    const isBannedFromUrl = errorParam === "banned" || reasonParam === "banned";
    if (isBannedFromUrl) {
      setIsBanned(true);
      if (isBannedFromUrl) {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("error");
        newParams.delete("reason");
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [searchParams]);



  //Handle de la connexion d'un user
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || !password) {
      setSubmitError(true);
      return;
    }

    setSubmitLoading(true);
    try {
      const loginResponse = await fetchProxy("/api/user/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      // Quota de connexion atteint : le serveur repond en texte brut, pas en
      // JSON. Sans ce cas traite avant l'analyse, la lecture echouait et
      // l'utilisateur ne voyait qu'une erreur generique sans savoir qu'il
      // devait simplement patienter.
      if (loginResponse.status === 429) {
        setShowRateLimitLogin(true);
        setSubmitLoading(false);
        return;
      }

      // Une reponse non-JSON (page d'erreur du serveur, coupure du proxy) ne
      // doit pas partir en exception : on affiche un message exploitable.
      const dataResponse = await loginResponse.json().catch(() => null);

      if (!dataResponse) {
        setServerError(true);
        setServerErrorMessage(
          "Le serveur n'a pas répondu correctement. Merci de réessayer dans un instant.",
        );
        setSubmitLoading(false);
        return;
      }

      if (!loginResponse.ok || !dataResponse.success) {
        if (loginResponse.status === 403 && dataResponse.reason === "unverified") {
          setVerificationError(true);
          setSubmitLoading(false);
          return;
        }
        if (loginResponse.status === 403) {
          setIsBanned(true);
          setServerError(false);
          setSubmitLoading(false);
          return;
        }
        setServerError(true);
        setServerErrorMessage(
          dataResponse.message ||
          "Une erreur est survenue, veuillez réessayer...",
        );
        setSubmitLoading(false);
        return;
      }

      if (!dataResponse.data?.isVerified) {
        setVerificationError(true);
        setSubmitLoading(false);
        return;
      }

      if (dataResponse.twoFactorRequired) {
        setTwoFactorEmail(dataResponse.data.email);
        setTwoFactorModalOpen(true);
        setSubmitLoading(false);
        return;
      }

      await fetchUser();
      onClose();
      locationState?.plan
        ? navigate("/souscription", {
          state: { plan: locationState?.plan || null },
        })
        : navigate("/dashboard");
    } catch (error) {
      setServerError(true);
      setSubmitLoading(false);
      console.error("🛑🛑🛑 ERREUR SERVEUR CONNEXION", error);
    }
  };

  const handleTwoFactorVerify = async (code: string) => {
    const response = await fetchProxy("/api/user/two-factor/verify", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      throw new Error(payload?.message ?? "Code invalide. Veuillez réessayer.");
    }

    await fetchUser();
    onClose();
    navigate("/dashboard");
  };

  const handleTwoFactorCancel = async () => {
    setTwoFactorModalOpen(false);
    setSubmitLoading(false);
    await fetchProxy("/api/user/auth/logout", {
      method: "POST",
      credentials: "include",
    }).catch(() => null);
  };



  const handleSubmitForgotPassword = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!email) {
      setSubmitForgotError(true);
      return;
    }

    setSubmitLoading(true);
    try {
      const response = await fetchProxy("/api/user/auth/forgotpassword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });

      if (response.status === 429) {
        setShowRateLimitModal(true);
        return;
      }

      // La confirmation ne s'affiche qu'une fois la demande réellement acceptée.
      if (response.ok) {
        setEmailSent(true);
      } else {
        setServerErrorMessage(
          "La demande n'a pas pu aboutir. Merci de réessayer dans un instant.",
        );
        setServerError(true);
      }
    } catch (error) {
      console.error(error);
      setServerErrorMessage(
        "Serveur injoignable. Vérifiez votre connexion et réessayez.",
      );
      setServerError(true);
    } finally {
      // Le bouton redevient actif dans tous les cas.
      setSubmitLoading(false);
    }
  };

  /**
   * Un seul bouton de soumission pour les deux étapes : à la première il fait
   * avancer vers le mot de passe, à la seconde il lance la connexion.
   */
  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (etape === "motDePasse") {
      void handleSubmit(event);
      return;
    }

    event.preventDefault();
    if (!email) {
      setSubmitError(true);
      return;
    }
    setEtape("motDePasse");
  };

  /** Retour à la saisie de l'adresse : le mot de passe déjà tapé n'a plus lieu d'être. */
  const handleChangerEmail = () => {
    setPassword("");
    setShowPassword(false);
    setEtape("email");
  };

  const handleChangeEmail = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  const handleChangePassword = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };


  // Le panneau est monté en dehors du header : la barre ne fait que 48 px de
  // haut, un formulaire posé dans son flux l'aurait déformée.
  return createPortal(
    <>
      {/* Zone transparente couvrant la page : un clic à côté referme le panneau. */}
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-panel-title"
        className="fixed right-3 top-14 z-50 flex max-h-[calc(100vh-4.5rem)] w-[360px] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-line-subtle px-5 py-3.5">
          <h2 id="login-panel-title" className="text-[15px] font-semibold text-ink">
            {forgotPassword ? "Mot de passe oublié" : "Connexion"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* La carte est bornée à la hauteur de l'écran (en-tête compris) : sur
            un petit écran, avec une bannière d'erreur, ce bloc défile. */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          {submitError && (
            <AlertBanner
              title="Champs manquants !"
              variant="error"
              detail="Vérifiez votre adresse e-mail et votre mot de passe."
              duration={8000}
              onClose={() => setSubmitError(false)}
            />
          )}

          {submitForgotError && (
            <AlertBanner
              title="E-mail manquant !"
              variant="error"
              detail="Pour réinitialiser votre mot de passe veuillez renseigner votre adresse e-mail."
              duration={8000}
              onClose={() => {
                setForgotPassword(true);
                setSubmitForgotError(false);
              }}
            />
          )}

          {showRateLimitModal && (
            <AlertBanner
              title="Trop de requêtes !"
              variant="error"
              detail="Vous avez demandé à réinitialiser votre mot de passe de trop nombreuses fois, veuillez attendre 15 minutes."
              duration={12000}
              onClose={() => setShowRateLimitModal(false)}
            />
          )}

          {showRateLimitLogin && (
            <AlertBanner
              title="Trop de tentatives de connexion"
              variant="error"
              detail="Par sécurité, les tentatives sont bloquées pendant 15 minutes. Réessayez ensuite, ou utilisez « Mot de passe oublié ? » si vous ne le retrouvez pas."
              duration={15000}
              onClose={() => setShowRateLimitLogin(false)}
            />
          )}

          {isBanned && (
            <AlertBanner
              title="Votre compte a été bloqué"
              variant="error"
              detail="Votre compte a été bloqué par les services de modération, si vous ne comprenez pas les raisons vous pouvez nous contacter par email à l'adresse contact@lumenjuris.com"
              duration={15000}
              onClose={() => setIsBanned(false)}
            />
          )}

          {serverError && (
            <AlertBanner
              title="Connexion impossible !"
              variant="error"
              detail={serverErrorMessage}
              duration={8000}
              onClose={() => {
                setServerError(false);
                setSubmitLoading(false);
              }}
            />
          )}

          {verificationError && (
            <AlertBanner
              title="Votre compte n'a pas été validé !"
              variant="error"
              detail={verificationErrorMessage}
              duration={10000}
              onClose={() => {
                setVerificationError(false);
                setSubmitLoading(false);
              }}
            />
          )}

          {emailSent && (
            <section className="flex flex-col gap-2">
              <AlertBanner
                title="E-mail envoyé !"
                variant="success"
                detail="Si un compte est associé à cette adresse, vous recevrez un lien de réinitialisation dans quelques instants."
                duration={12000}
                onClose={() => {
                  setEmailSent(false);
                  setSubmitLoading(false);
                }}
              />
              <p className="text-[12.5px] leading-relaxed text-ink-muted">
                Pensez à vérifier vos spams si vous ne recevez rien dans quelques
                minutes.
              </p>
            </section>
          )}

          {forgotPassword ? (
            <form
              onSubmit={handleSubmitForgotPassword}
              className="flex flex-col gap-4"
            >
              <Field>
                <FieldDescription className="text-[12.5px] leading-relaxed text-ink-muted">
                  Saisissez l'adresse e-mail associée à votre compte. Vous
                  recevrez un lien pour créer un nouveau mot de passe.
                </FieldDescription>
                <Input
                  id="forgot-email"
                  type="email"
                  autoFocus
                  placeholder="Votre e-mail de connexion"
                  value={email}
                  onChange={handleChangeEmail}
                />
              </Field>

              <Button
                className="w-full text-background border border-lumenjuris"
                disabled={submitLoading || submitForgotError}
                type="submit"
                size="lg"
              >
                <SendIcon className="h-4 w-4" />
                Envoyer
              </Button>

              <button
                type="button"
                className="w-fit self-center text-[12.5px] text-ink-muted underline-offset-2 transition-colors hover:text-brand hover:underline"
                onClick={() => setForgotPassword(false)}
              >
                Revenir à la connexion
              </button>
            </form>
          ) : (
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="email" className="text-[13px]">
                  E-mail
                </FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoFocus={etape === "email"}
                  readOnly={etape === "motDePasse"}
                  placeholder="Saisissez votre e-mail de connexion"
                  value={email}
                  onChange={handleChangeEmail}
                  className={
                    etape === "motDePasse"
                      ? "bg-surface-subtle text-ink-secondary"
                      : undefined
                  }
                />
              </Field>

              {etape === "email" ? (
                <Button
                  className="w-full text-background border border-lumenjuris"
                  disabled={submitLoading || !email}
                  type="submit"
                  size="lg"
                >
                  <MailIcon className="h-4 w-4" />
                  Continuer avec l'email
                </Button>
              ) : (
                <button
                  type="button"
                  onClick={handleChangerEmail}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-line text-sm font-medium text-ink-secondary transition-colors hover:border-brand/40 hover:text-brand"
                >
                  <PencilIcon className="h-4 w-4" />
                  Changer d'email
                </button>
              )}

              {/* Le mot de passe n'apparaît qu'une fois l'adresse validée. */}
              {etape === "motDePasse" && (
                <>
                  <Field>
                    <FieldLabel htmlFor="password" className="text-[13px]">
                      Mot de passe
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoFocus
                        placeholder="Saisissez votre mot de passe"
                        value={password}
                        onChange={handleChangePassword}
                      />
                      <InputGroupAddon
                        align="inline-end"
                        onClick={() => setShowPassword(!showPassword)}
                        className="hover:cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </InputGroupAddon>
                    </InputGroup>
                  </Field>

                  <Button
                    className="w-full text-background border border-lumenjuris"
                    disabled={submitLoading || submitError}
                    type="submit"
                    size="lg"
                  >
                    <LogInIcon className="h-4 w-4" />
                    Se connecter
                  </Button>
                </>
              )}

              <div className="flex items-center gap-3">
                <div className="h-px w-full bg-line" />
                <span className="text-[11px] font-medium tracking-wide text-ink-subtle">
                  OU
                </span>
                <div className="h-px w-full bg-line" />
              </div>

              <ConnectGoogle />
              <ConnectMicrosoft />

              <button
                type="button"
                className="w-fit self-center text-[12.5px] text-ink-muted underline-offset-2 transition-colors hover:text-brand hover:underline"
                onClick={() => setForgotPassword(true)}
              >
                Mot de passe oublié ?
              </button>

              <p className="text-center text-[12.5px] text-ink-muted">
                Pas encore de compte ?{" "}
                <button
                  type="button"
                  onClick={onSwitchToSignup}
                  className="font-semibold text-brand underline-offset-2 transition-colors hover:underline"
                >
                  Inscrivez-vous
                </button>
              </p>
            </form>
          )}
        </div>
      </div>

      <TwoFactorCodeModal
        open={twoFactorModalOpen}
        email={twoFactorEmail}
        onVerify={handleTwoFactorVerify}
        onCancel={() => {
          void handleTwoFactorCancel();
        }}
      />
    </>,
    document.body,
  );
};
