import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import { AlertBanner } from "../common/AlertBanner";

export function TwoFactorCodeModal({
  open,
  email,
  onCancel,
  onVerify,
  onResendMail,
}: {
  open: boolean;
  email: string;
  onVerify: (code: string) => Promise<void>;
  onCancel: () => void;
  onResendMail?: () => void;
}) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [sendMailSuccess, setMailSuccess] = useState(false);
  const [sendMailError, setMailError] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDigits(Array(6).fill(""));
    setError(null);
    setIsLoading(false);
    setMailError(false);
    setMailSuccess(false);

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) {
        onCancel();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    // Focus le premier input à l'ouverture
    setTimeout(() => inputRefs.current[0]?.focus(), 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError(null);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleResendMail = async () => {
    if (!onResendMail) return;

    setIsLoading(true);
    setError(null);

    try {
      await onResendMail();
      
      setMailSuccess(true);
    } catch (err) {
      setMailError(true);
      setError(err instanceof Error ? err.message : "Impossible de renvoyer le code. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        setDigits(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        const next = [...digits];
        next[index - 1] = "";
        setDigits(next);
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pasted) {
      return;
    }
    const next = Array(6).fill("");
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setDigits(next);
    setError(null);
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async () => {
    const code = digits.join("");
    if (code.length < 6) {
      setError("Veuillez saisir les 6 chiffres du code.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onVerify(code);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Code invalide. Veuillez réessayer.",
      );
      setIsLoading(false);
      setDigits(Array(6).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 0);
    }
  };

  if (!open || typeof document === "undefined") {
    return null;
  }

  const code = digits.join("");

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
      onClick={() => {
        if (!isLoading) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="two-factor-modal-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-4">
          <div>
            <h3
              id="two-factor-modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              Vérification en deux étapes
            </h3>
            {sendMailSuccess && (
              <AlertBanner
                title="E-mail envoyé !"
                variant="success"
                detail="Un nouveau code de vérification vous a été envoyé par mail."
                duration={8000}
                onClose={() => setMailSuccess(false)}
              />
            )}

            {sendMailError && (
              <AlertBanner
                title="Erreur de l'envoi du mail !"
                variant="error"
                detail="Un nouveau code de vérification n'a pas pu être envoyé par mail. Veuillez réessayer."
                duration={8000}
                onClose={() => setMailError(false)}
              />
            )}

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Un code à 6 chiffres a été envoyé à{" "}
              <span className="font-medium text-gray-800">{email}</span>.
              Saisissez-le ci-dessous pour activer l&apos;authentification à
              deux facteurs.
            </p>
          </div>

          <div className="flex justify-center gap-2 py-2">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                disabled={isLoading}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className={[
                  "h-12 w-10 rounded-lg border text-center text-xl font-bold transition-colors outline-none",
                  "focus:border-lumenjuris focus:ring-2 focus:ring-lumenjuris/30",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  error
                    ? "border-red-400 bg-red-50"
                    : digit
                      ? "border-lumenjuris bg-lumenjuris/5"
                      : "border-gray-300 bg-white",
                ].join(" ")}
              />
            ))}
          </div>

          {error ? (
            <p className="text-center text-sm text-red-600">{error}</p>
          ) : null}

          <div className="flex justify-end gap-3 pt-1">
            <Button
              type="button"
              onClick={ handleResendMail }
              disabled={isLoading}
              className="bg-lumenjuris text-white hover:bg-lumenjuris/90"
            >
              {isLoading ? "Envoi en cours..." : "Renvoyer un mail"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleSubmit();
              }}
              disabled={isLoading || code.length < 6}
              className="bg-lumenjuris text-white hover:bg-lumenjuris/90"
            >
              {isLoading ? "Vérification…" : "Vérifier"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
