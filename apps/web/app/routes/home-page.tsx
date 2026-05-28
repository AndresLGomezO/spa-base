import { useAuth } from "../auth/AuthContext";

export function HomePage() {
  const { user, logout } = useAuth();

  return (
    <>
      <h1>Home</h1>
      <p>Authenticated session active.</p>
      <p>
        Signed in as <strong>{user?.email ?? "unknown user"}</strong>
      </p>
      <p>Provider: {user?.providerId ?? "email/password"}</p>
      <button type="button" onClick={logout}>
        Logout
      </button>
    </>
  );
}
