import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Alert, Button, Card, Heading, Logo, Text } from "@repo/ui";

import { useAuth } from "../auth/AuthContext";
import { LoginSettings } from "../components/LoginSettings";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LoginPage() {
  const { t } = useTranslation("common");
  const { error: authError, loginWithGoogle } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeError = error ?? authError;
  const year = new Date().getFullYear();

  async function handleGoogleLogin() {
    setSubmitting(true);
    setError(null);

    const result = await loginWithGoogle();

    setSubmitting(false);
    if (!result.success) {
      setError(result.error ?? t("login.googleFailed"));
    }
  }

  return (
    <div className="from-primary-100/40 via-background to-background dark:from-primary-950/30 relative flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-gradient-to-br px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <Card variant="glass" className="w-full">
          <Logo size="md" />
          <div className="flex flex-col gap-1">
            <Heading level={1}>{t("login.title")}</Heading>
            <Text variant="muted">{t("login.subtitle")}</Text>
          </div>

          {activeError ? <Alert>{activeError}</Alert> : null}

          <Button
            type="button"
            variant="outline"
            size="lg"
            fullWidth
            loading={submitting}
            onClick={() => void handleGoogleLogin()}
          >
            <GoogleIcon />
            {submitting ? t("login.waiting") : t("login.signInGoogle")}
          </Button>
        </Card>

        <Text variant="caption" className="text-center">
          {t("login.rightsReserved", { year })}
        </Text>
      </div>

      <LoginSettings />
    </div>
  );
}
