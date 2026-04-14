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
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
} from "../ui/Field";
import { Separator } from "../ui/Separator";
import { Checkbox } from "../ui/Checkbox";
import { Label } from "../ui/Label";
import { EyeOffIcon, EyeIcon, SendIcon } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import { AlertBanner } from "../common/AlertBanner";

import { useState, useEffect } from "react";

//  forgotPassword={forgotPassword}
//                   setForgotPassword={setForgotPassword}

interface LoginFormProps {
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  forgotPassword: boolean;
  setForgotPassword: React.Dispatch<React.SetStateAction<boolean>>;
  emailSent: boolean;
  setEmailSent: React.Dispatch<React.SetStateAction<boolean>>;
}

const LoginForm = ({
  email,
  setEmail,
  password,
  setPassword,
  forgotPassword,
  setForgotPassword,
  emailSent,
  setEmailSent,
}: LoginFormProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [submitForgotError, setSubmitForgotError] = useState(false);

  useEffect(() => {
    setForgotPassword(false);
    setEmailSent(false);
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      setSubmitError(true);
    }
  };

  const handleSubmitForgotPassword = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!email) {
      setSubmitForgotError(true);
    } else {
      setEmailSent(true);
    }
  };

  const handleChangeEmail = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setEmail(value);
    // const emailRegex =
    //   /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    // if (value.length > 0 && !emailRegex.test(value)) {
    //   setEmailError("L'adresse email n'est pas valide");
    // } else {
    //   setEmailError("");
    // }
  };

  const handleChangePassword = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPassword(value);
  };

  return (
    <div className="flex flex-col gap-5">
      {submitError && (
        <AlertBanner
          title="Champs manquants"
          variant="error"
          detail="Vérifiez votre adresse email et votre mot de passe"
          onClose={() => {
            setSubmitError(false);
          }}
        />
      )}
      {submitForgotError && (
        <AlertBanner
          title="Email manquant"
          variant="error"
          detail="Pour réinitialiser votre mot de passe veuillez renseigner votre adresse email"
          onClose={() => {
            setSubmitForgotError(false);
            setForgotPassword(true);
          }}
        />
      )}
      {emailSent === true ? (
        <AlertBanner
          title="Demande envoyée !"
          variant="success"
          detail="Un email avec un lien de réinitialisation à été envoyé à votre adresse email"
          onClose={() => {
            setSubmitForgotError(false);
            setForgotPassword(true);
          }}
        />
      ) : (
        <></>
      )}

      {forgotPassword === true ? (
        <div className="flex flex-col gap-6">
          {emailSent === true ? (
            <>
              <div className="w-full h-px bg-border"></div>

              <Button
                className="text-background border border-lumenjuris"
                size="lg"
                onClick={() => {
                  setForgotPassword(false);
                  setEmailSent(false);
                }}
              >
                Se connecter
              </Button>
            </>
          ) : (
            <>
              <h2>
                Renseignez votre email de connexion pour réinitialiser votre mot
                de passe :
              </h2>
              <form onSubmit={handleSubmitForgotPassword}>
                <section className="flex flex-col gap-6">
                  <Field>
                    {/* <FieldLabel htmlFor="email">Email</FieldLabel> */}
                    <FieldDescription className="text-gray-500">
                      Un lien de réinitialisation vous sera envoyer à cette
                      adresse
                    </FieldDescription>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Votre email de connexion"
                      value={email}
                      onChange={handleChangeEmail}
                    />
                  </Field>

                  <div className="w-full h-px bg-border"></div>

                  <div className="grid gap-2">
                    <Button
                      className="text-background border border-lumenjuris"
                      disabled={
                        submitLoading ? true : submitForgotError ? true : false
                      }
                      type="submit"
                      size="lg"
                    >
                      Envoyer
                      <SendIcon />
                    </Button>
                  </div>
                </section>
              </form>
            </>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <section className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="Saisissez votre email de connexion"
                  value={email}
                  onChange={handleChangeEmail}
                />
              </Field>
            </div>

            <div className="grid gap-2">
              <Field className="max-w-sm">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Saisissez votre mot de passe"
                    value={password}
                    onChange={handleChangePassword}
                  />
                  <InputGroupAddon
                    align="inline-end"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:cursor-pointer"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </div>

            <div className="w-full h-px bg-border"></div>

            <div className="grid gap-2">
              <Button
                className="text-background border border-lumenjuris"
                disabled={submitLoading ? true : submitError ? true : false}
                type="submit"
                size="lg"
              >
                Se connecter
              </Button>
              <button className="w-full h-10 border border-lumenjuris text-[20px] flex justify-center items-center gap-2 rounded-md text-lumenjuris">
                <FcGoogle />
                <span className="text-[14px]">Se connecter avec Google</span>
              </button>
              <Button
                variant="ghost"
                onClick={() => {
                  setForgotPassword(true);
                }}
              >
                Mot de passe oublié ?
              </Button>
            </div>
          </section>
        </form>
      )}
    </div>
  );
};

export default LoginForm;
