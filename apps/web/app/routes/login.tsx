import { RedirectIfAuthenticated } from "../auth/AuthGuards";
import { LoginPage } from "./login-page";

export function meta() {
  return [
    { title: "Login" },
    { name: "description", content: "Login with Firebase Auth." },
  ];
}

export default function LoginRoute() {
  return (
    <RedirectIfAuthenticated>
      <LoginPage />
    </RedirectIfAuthenticated>
  );
}
