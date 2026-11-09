import { z } from "zod";
import { Button } from "@/client/components/ui/button";
import {
  getCurrentAuthRedirect,
  getOAuthSignedQuery,
} from "@/lib/auth-redirect";
import { isHostedClientAuthMode, usesBetterAuthClient } from "@/lib/auth-mode";
import { PRIVACY_URL, TERMS_URL } from "@/shared/terms";

export const authRedirectSearchSchema = z.object({
  redirect: z.string().optional(),
});

// dataSEO: the auth forms use the app's own look, white inputs on the card
// and the primary purple submit button.
export const authInputClassName = "h-10 bg-card text-base md:text-[15px]";
export const authSubmitClassName =
  "h-10 w-full border-transparent bg-primary font-semibold text-primary-foreground hover:bg-primary/90";

export function useAuthPageState(redirect: string | undefined) {
  const redirectTo = getCurrentAuthRedirect(redirect);
  const oauthQuery =
    typeof window !== "undefined"
      ? getOAuthSignedQuery(window.location.search)
      : null;
  const isHostedMode = isHostedClientAuthMode();
  // Better Auth accounts exist (hosted or the standalone Docker edition), so
  // the email/password form can sign someone in.
  const isBetterAuthMode = usesBetterAuthClient();

  return {
    redirectTo,
    oauthQuery,
    isHostedMode,
    isBetterAuthMode,
  };
}

const termsLinkClassName =
  "text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors";

// Clickwrap: shown next to every button that can create an account, so
// clicking it is the affirmative acceptance the signup hook records.
export function TermsAgreementNotice({ action }: { action: string }) {
  return (
    <p className="text-center text-sm leading-relaxed text-muted-foreground">
      {action}, você concorda com os{" "}
      <a
        href={TERMS_URL}
        target="_blank"
        rel="noreferrer"
        className={termsLinkClassName}
      >
        Termos
      </a>{" "}
      e a{" "}
      <a
        href={PRIVACY_URL}
        target="_blank"
        rel="noreferrer"
        className={termsLinkClassName}
      >
        Política de Privacidade
      </a>
      .
    </p>
  );
}

export function AuthMethodChooser({
  googleLabel,
  emailLabel = "Continuar com e-mail",
  isBusy,
  disabled,
  onContinueWithGoogle,
  onContinueWithEmail,
}: {
  googleLabel: string;
  emailLabel?: string;
  isBusy?: boolean;
  disabled?: boolean;
  onContinueWithGoogle: () => void;
  onContinueWithEmail: () => void;
}) {
  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full border-black/10 !bg-white font-semibold !text-neutral-900 hover:border-black/20 hover:!bg-neutral-50"
        onClick={onContinueWithGoogle}
        disabled={disabled || isBusy}
      >
        <GoogleLogo />
        {isBusy ? "Abrindo o Google..." : googleLabel}
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full bg-card font-semibold dark:border-border dark:bg-card"
        onClick={onContinueWithEmail}
        disabled={disabled || isBusy}
      >
        {emailLabel}
      </Button>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" className="size-4 shrink-0">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.72H.94v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.7A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.16.28-1.7V4.96H.94A9 9 0 0 0 0 9c0 1.45.34 2.82.94 4.04l3.02-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.64 8.64 0 0 0 9 0 9 9 0 0 0 .94 4.96L3.96 7.3C4.67 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export function AuthPageCard({
  title,
  helperText,
  children,
  footer,
}: {
  title: string;
  helperText?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-sm space-y-5">
      <img
        src="/logo-dataseo.png"
        alt="dataSEO"
        className="mx-auto block h-auto w-[168px]"
      />
      <div className="overflow-hidden rounded-[10px] border border-border bg-card shadow-[0_1px_2px_rgba(29,26,43,0.04)]">
        <div className="h-[3px] bg-[#ff6446]" aria-hidden />
        <div className="space-y-5 p-6">
          <div>
            <h1 className="text-[20px] font-semibold tracking-[-.01em]">
              {title}
            </h1>
            {helperText ? (
              <p className="mt-1 text-[13.5px] text-muted-foreground">
                {helperText}
              </p>
            ) : null}
          </div>
          <div className="space-y-4">{children}</div>
        </div>
      </div>

      {footer ? <div className="text-center text-[13px]">{footer}</div> : null}
    </div>
  );
}

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    // `h-[100dvh]` + `overflow-y-auto` makes this a scroll container, and the
    // auto-margin child centers when it fits but stays fully reachable (top and
    // bottom) when it's taller than the viewport. Plain `justify-center` clips
    // the overflow with no way to scroll to it.
    <div className="flex h-[100dvh] flex-col items-center overflow-y-auto bg-background p-4">
      <div className="m-auto flex w-full flex-col items-center">{children}</div>
    </div>
  );
}
