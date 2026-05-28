import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { t } = useTranslation("common");
  const {
    error: authError,
    loginWithEmailPassword,
    loginWithGoogle,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeError = error ?? authError;

  async function handleEmailPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await loginWithEmailPassword(email, password);

    setSubmitting(false);
    if (!result.success) {
      setError(result.error ?? t("login.failed"));
    }
  }

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
    <>
      <h1>{t("login.title")}</h1>
      <p>{t("login.subtitle")}</p>

      {activeError ? (
        <p role="alert" className="text-destructive">
          {activeError}
        </p>
      ) : null}

      <form onSubmit={handleEmailPasswordSubmit}>
        <label htmlFor="email">{t("login.email")}</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="password">{t("login.password")}</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <button type="submit" disabled={submitting}>
          {submitting ? t("login.signingIn") : t("login.signInEmailPassword")}
        </button>
      </form>

      <hr />

      <button type="button" onClick={handleGoogleLogin} disabled={submitting}>
        {submitting ? t("login.waiting") : t("login.signInGoogle")}
      </button>
    </>
  );
}
