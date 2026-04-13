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
import { EyeOffIcon, EyeIcon } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import { AlertBanner } from "../common/AlertBanner";

import { useState } from "react";

//  forgotPassword={forgotPassword}
//                   setForgotPassword={setForgotPassword}

interface LoginFormProps {
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  setForgotPassword: React.Dispatch<React.SetStateAction<boolean>>;
}

const LoginForm = ({
  email,
  setEmail,
  password,
  setPassword,
  setForgotPassword,
}: LoginFormProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      setSubmitError(true);
    }
    console.log(event);
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
    <section className="flex flex-col gap-5">
      {submitError && (
        <AlertBanner
          title="Champs manquants"
          variant="error"
          detail="Vérifiez votre email et votre mot de passe"
          onClose={() => {
            setSubmitError(false);
          }}
        />
      )}

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <div className="grid gap-2">
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="Saisissez votre email de connexion"
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
        </div>
      </form>
    </section>
  );
};

export default LoginForm;
