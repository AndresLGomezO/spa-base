import { RedirectIfAuthenticated } from "../routing/RouteGuards";
import { LoginPage } from "./login-page";

export function meta() {
  return [
    { title: "Login" },
    { name: "description", content: "Sign in with your Google account." },
  ];
}

export default function LoginRoute() {
  return (
    <RedirectIfAuthenticated>
      <LoginPage />
    </RedirectIfAuthenticated>
  );
}
