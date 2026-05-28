import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";

import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
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
      setError(result.error ?? "Login failed.");
      return;
    }
    navigate("/", { replace: true });
  }

  async function handleGoogleLogin() {
    setSubmitting(true);
    setError(null);

    const result = await loginWithGoogle();

    setSubmitting(false);
    if (!result.success) {
      setError(result.error ?? "Google login failed.");
      return;
    }
    navigate("/", { replace: true });
  }

  return (
    <>
      <h1>Login</h1>
      <p>Sign in with Firebase Auth (local emulator friendly).</p>

      {activeError ? (
        <p role="alert" style={{ color: "crimson" }}>
          {activeError}
        </p>
      ) : null}

      <form onSubmit={handleEmailPasswordSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
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
          {submitting ? "Signing in..." : "Sign in with email/password"}
        </button>
      </form>

      <hr />

      <button type="button" onClick={handleGoogleLogin} disabled={submitting}>
        {submitting ? "Waiting..." : "Sign in with Google"}
      </button>
    </>
  );
}
