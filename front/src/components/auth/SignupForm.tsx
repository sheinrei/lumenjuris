// UI //
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../ui/InputGroup";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "../ui/Field";
import { Checkbox } from "../ui/Checkbox";
import { EyeOffIcon, EyeIcon, PenBoxIcon, X } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import { AlertBanner } from "../common/AlertBanner";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { VerifierBoiteMail } from "./VerifierBoiteMail";
import { fetchProxy } from "../../utils/fetchProxy";




const PROXY_URL: string =
  import.meta.env.VITE_URL_PROXY || "http://localhost:3000";


interface SignupFormProps {
  /** Referme le panneau : croix, clic à côté, touche Échap. */
  onClose: () => void;
  /** Bascule sur le panneau de connexion, depuis le pied du formulaire ou
   *  l'écran « Vérifiez votre boîte mail ». */
  onSwitchToLogin: () => void;
}

/**
 * Panneau de création de compte affiché depuis l'en-tête. Comme LoginForm, il
 * porte lui-même sa présentation : une carte flottante ancrée sous le bouton
 * « Inscrivez-vous », montée via un portail pour ne pas déformer la barre de
 * navigation.
 *
 * Une fois le compte créé, le formulaire cède la place à l'écran
 * « Vérifiez votre boîte mail », dans le même panneau.
 */
export const SignupForm = ({ onClose, onSwitchToLogin }: SignupFormProps) => {

  // Adresse à laquelle l'e-mail de vérification vient de partir : tant qu'elle
  // est renseignée, l'écran de vérification remplace le formulaire.
  const [emailAVerifier, setEmailAVerifier] = useState<string | null>(null);

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptCgu, setAcceptCgu] = useState(false);

  const [confirmPassword, setConfirmPassword] = useState("");


  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [submitError, setSubmitError] = useState(false);
  const [submitCguError, setSubmitCguError] = useState(false);
  const [submitPending, setSubmitPending] = useState(false);
  const [serverError, setServerError] = useState(false);
  const [serverErrorMessage, setServerErrorMessage] = useState("");









  // Échap referme le panneau, comme la croix.
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const passwordErrorTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Les messages sont rendus sous le bouton d'inscription : on amene ce bloc
  // dans le champ de vision plutot que le haut du formulaire, sinon la reponse
  // s'affiche hors ecran juste apres le clic.
  const feedbackRef = useRef<HTMLDivElement>(null);
  const scrollToFeedback = () => {
    // Laisse React peindre l'alerte avant de la faire defiler.
    requestAnimationFrame(() => {
      feedbackRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!lastName || !email || !password) {
      setSubmitError(true);
      scrollToFeedback();
      return;
    }
    if (acceptCgu === false) {
      setSubmitCguError(true);
      scrollToFeedback();
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError("Les mots de passe doivent être identiques");
      return;
    }

    if (passwordError) {
      return;
    }

    setSubmitLoading(true);
    setSubmitPending(true);
    scrollToFeedback();
    const trimedLastName = lastName.trim();
    const trimedFirstName = firstName.trim();

    try {
      const signupResponse = await fetchProxy("/api/user/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          nom: trimedLastName,
          prenom: trimedFirstName,
          password,
          cgu: acceptCgu,
        }),
        credentials: "include",
      });

      // Une reponse non-JSON (page d'erreur, proxy coupe) ne doit pas partir en
      // exception : sans ce garde-fou l'utilisateur ne voyait qu'un message
      // generique de creation impossible.
      const data = await signupResponse.json().catch(() => null);

      if (!signupResponse.ok) {
        setSubmitPending(false);
        setServerError(true);
        // Le limiteur d'inscriptions repond dans "error", les autres routes
        // dans "message" : sans les deux, la banniere s'affichait vide.
        setServerErrorMessage(
          data?.message ||
          data?.error ||
          (signupResponse.status === 429
            ? "Trop de tentatives d'inscription. Réessayez dans une heure."
            : "Une erreur s'est produite, nous n'avons pas pu créer votre compte..."),
        );
        // Le bouton doit redevenir cliquable : l'utilisateur a une correction a
        // faire (adresse deja prise, mot de passe trop court) et doit pouvoir
        // resoumettre sans avoir a fermer la banniere au prealable.
        setSubmitLoading(false);
        scrollToFeedback();
        return;
      }

      if (data?.mailSent === false) {
        // Compte créé mais e-mail non parti : on affiche le message du serveur
        // plutôt qu'une confirmation d'envoi, pour que l'utilisateur sache
        // qu'il doit passer par le renvoi.
        setSubmitPending(false);
        setServerError(true);
        setServerErrorMessage(data.message);
        setSubmitLoading(false);
      } else {
        // Compte créé et e-mail parti : le panneau bascule sur l'écran de
        // vérification, qui dit où chercher le lien et permet de le renvoyer.
        setSubmitPending(false);
        setSubmitLoading(false);
        setEmailAVerifier(email);
        return;
      }
      scrollToFeedback();
    } catch (error) {
      setSubmitPending(false);
      setSubmitLoading(false);
      setServerError(true);
      setServerErrorMessage(
        "Une erreur s'est produite, nous n'avons pas pu créer votre compte...",
      );
      console.error("🛑🛑🛑 ERREUR SERVEUR INSCRIPTION", error);
    }
  };





  // Inscription via Google
  const handleSubmitGoogle = async () => {
    await fetchProxy(`${PROXY_URL}/api/user/auth/google`);
  };





  const handleChangeLastname = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setLastName(value);
  };

  const handleChangeFirstname = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value.trim();
    setFirstName(value);
  };

  const handleChangeEmail = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setEmail(value);
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    if (value.length > 0 && !emailRegex.test(value)) {
      setEmailError("L'adresse e-mail n'est pas valide");
    } else {
      setEmailError("");
    }
  };

  const handleChangePassword = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPassword(value);
    setPasswordError("");

    if (passwordErrorTimeout.current)
      clearTimeout(passwordErrorTimeout.current);

    passwordErrorTimeout.current = setTimeout(() => {
      if (value.length > 0 && value.length < 8) {
        setPasswordError("Le mot de passe est trop court");
      } else if (value.length >= 8 && !/[A-Z]/.test(value)) {
        setPasswordError("Le mot de passe doit contenir au moins 1 majuscule");
      } else if (value.length >= 8 && !/[0-9]/.test(value)) {
        setPasswordError("Le mot de passe doit contenir au moins 1 chiffre");
      } else if (value.length >= 8 && !/[^a-zA-Z0-9]/.test(value)) {
        setPasswordError(
          "Le mot de passe doit contenir au moins 1 caractère spécial",
        );
      }
    }, 500);
  };

  const handleChangeConfirmPassword = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value;
    setConfirmPassword(value);
    if (value.length >= 8 && value !== password) {
      setConfirmPasswordError("Les mots de passe doivent être identiques !");
    } else if (value.length >= 8 && value === password) {
      setConfirmPasswordError("");
    }
  };

  const handleCheckCgu = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.checked;
    setAcceptCgu(value);
  };

  // Bloc de retour affiché sous le bouton d'inscription : la réponse apparaît
  // là où l'utilisateur vient de cliquer.
  const feedback = (
    <div ref={feedbackRef} className="flex flex-col gap-3 empty:hidden">
      {submitError && (
        <AlertBanner
          title="Champs manquants !"
          variant="error"
          detail="Certains champs obligatoires sont manquants."
          onClose={() => setSubmitError(false)}
        />
      )}

      {submitCguError && (
        <AlertBanner
          title="CGU !"
          variant="error"
          detail="Vous devez accepter nos CGU."
          onClose={() => setSubmitCguError(false)}
        />
      )}

      {serverError && (
        <AlertBanner
          title="Une erreur est survenue"
          variant="error"
          detail={serverErrorMessage}
          onClose={() => {
            setServerError(false);
            setSubmitLoading(false);
            setServerErrorMessage("");
          }}
        />
      )}

      {submitPending && (
        <AlertBanner
          title="Inscription en cours…"
          variant="info"
          detail={`Création de votre compte et envoi de l'email de vérification à ${email}.`}
          duration={0}
          onClose={() => setSubmitPending(false)}
        />
      )}
    </div>
  );

  // Le panneau est monté en dehors du header : la barre ne fait que 48 px de
  // haut, un formulaire posé dans son flux l'aurait déformée.
  return createPortal(
    <>
      {/* Zone transparente couvrant la page : un clic à côté referme le panneau. */}
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-panel-title"
        className="fixed right-3 top-14 z-50 flex max-h-[calc(100vh-4.5rem)] w-[380px] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-line-subtle px-5 py-3.5">
          <h2 id="signup-panel-title" className="text-[15px] font-semibold text-ink">
            {emailAVerifier ? "Vérifiez votre boîte mail" : "Créer un compte"}
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

        {/* Le formulaire est long : la carte est bornée à la hauteur de l'écran
            (en-tête compris) et c'est ce bloc qui défile. */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {emailAVerifier ? (
            <VerifierBoiteMail
              email={emailAVerifier}
              onModifier={() => setEmailAVerifier(null)}
              onSeConnecter={onSwitchToLogin}
            />
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field>
                <FieldLabel
                  htmlFor="lastname"
                  className="text-[13px] after:text-danger after:content-['*']"
                >
                  Nom
                </FieldLabel>
                <Input
                  id="lastname"
                  type="text"
                  autoFocus
                  placeholder="Dupond"
                  value={lastName}
                  onChange={handleChangeLastname}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="firstname" className="text-[13px]">
                  Prénom
                </FieldLabel>
                <Input
                  id="firstname"
                  type="text"
                  placeholder="Jenny"
                  value={firstName}
                  onChange={handleChangeFirstname}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="signup-email"
                  className="text-[13px] after:text-danger after:content-['*']"
                >
                  E-mail
                </FieldLabel>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="mail@example.com"
                  value={email}
                  onChange={handleChangeEmail}
                  className={
                    emailError
                      ? "text-destructive border-destructive focus-visible:border-destructive focus-visible:ring-destructive ring-1 ring-destructive"
                      : undefined
                  }
                />
                <FieldError
                  errors={emailError ? [{ message: emailError }] : undefined}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="signup-password"
                  className="text-[13px] after:text-danger after:content-['*']"
                >
                  Mot de passe
                </FieldLabel>
                <InputGroup
                  className={
                    passwordError
                      ? "border-2 border-destructive has-[[data-slot=input-group-control]:focus-visible]:border-destructive has-[[data-slot=input-group-control]:focus-visible]:border-2 has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot=input-group-control]:focus-visible]:ring-destructive"
                      : undefined
                  }
                >
                  <InputGroupInput
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Choisissez un mot de passe"
                    value={password}
                    onChange={handleChangePassword}
                    className={passwordError ? "text-destructive" : undefined}
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
                <FieldError
                  errors={passwordError ? [{ message: passwordError }] : undefined}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="confirmpassword"
                  className="text-[13px] after:text-danger after:content-['*']"
                >
                  Confirmer le mot de passe
                </FieldLabel>
                <InputGroup
                  className={
                    confirmPasswordError
                      ? "border-2 border-destructive has-[[data-slot=input-group-control]:focus-visible]:border-destructive has-[[data-slot=input-group-control]:focus-visible]:border-2 has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot=input-group-control]:focus-visible]:ring-destructive"
                      : undefined
                  }
                >
                  <InputGroupInput
                    id="confirmpassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirmez votre mot de passe"
                    value={confirmPassword}
                    onChange={handleChangeConfirmPassword}
                    className={confirmPasswordError ? "text-destructive" : undefined}
                  />
                  <InputGroupAddon
                    align="inline-end"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="hover:cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOffIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </InputGroupAddon>
                </InputGroup>
                <FieldError
                  errors={
                    confirmPasswordError
                      ? [{ message: confirmPasswordError }]
                      : undefined
                  }
                />
              </Field>

              <FieldGroup>
                <Field orientation="horizontal">
                  <Checkbox
                    id="terms-checkbox-desc"
                    name="terms-checkbox-desc"
                    checked={acceptCgu}
                    defaultChecked={false}
                    onCheckedChange={(checked) => {
                      handleCheckCgu({
                        target: { checked },
                      } as React.ChangeEvent<HTMLInputElement>);
                    }}
                    className="border-ring"
                  />
                  <FieldDescription className="text-[12.5px] after:ml-1 after:text-danger after:content-['*']">
                    Accepter nos{" "}
                    <a
                      href="https://www.lumenjuris.com/conditions-generales-dutilisation/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 hover:cursor-pointer hover:text-brand"
                    >
                      CGU
                    </a>
                  </FieldDescription>
                </Field>
              </FieldGroup>

              <span className="text-[12px] text-ink-subtle before:mr-1 before:text-danger before:content-['*']">
                Champs obligatoires.
              </span>

              <Button
                className="w-full text-background border border-lumenjuris"
                disabled={submitLoading || submitError || submitCguError}
                type="submit"
                size="lg"
              >
                <PenBoxIcon className="h-4 w-4" />
                S'inscrire
              </Button>

              {feedback}

              <div className="flex items-center gap-3">
                <div className="h-px w-full bg-line" />
                <span className="text-[11px] font-medium tracking-wide text-ink-subtle">
                  OU
                </span>
                <div className="h-px w-full bg-line" />
              </div>

              <button
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-lumenjuris text-sm font-medium text-lumenjuris transition-colors hover:bg-lumenjuris-background"
                type="button"
                onClick={handleSubmitGoogle}
              >
                <FcGoogle className="text-[18px]" />
                S'inscrire avec Google
              </button>

              <p className="text-center text-[12.5px] text-ink-muted">
                Déjà un compte ?{" "}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="font-semibold text-brand underline-offset-2 transition-colors hover:underline"
                >
                  Se connecter
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
};
