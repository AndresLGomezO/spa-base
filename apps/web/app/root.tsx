import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  type LinksFunction,
} from "react-router";

import { COLOR_SCHEME_KEY, ThemeProvider } from "@repo/theme/react";

import { AuthProvider } from "./auth/AuthProvider";
import { AppChrome } from "./components/AppChrome";
import { I18nSync } from "./components/I18nSync";
import "./i18n";
import { i18n } from "./i18n";
import "./app.css";

export const links: LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "icon", href: "/favicon.ico", sizes: "any" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem("${COLOR_SCHEME_KEY}")==="dark"){document.documentElement.classList.add("dark")}}catch(e){}})();`,
          }}
        />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function HydrateFallback() {
  return (
    <main aria-busy="true">
      <p>{i18n.t("loading")}</p>
    </main>
  );
}

function AppShell() {
  const location = useLocation();
  const isLoginRoute = location.pathname === "/login";

  return (
    <>
      <I18nSync />
      {!isLoginRoute ? <AppChrome /> : null}
      <main>
        <Outlet />
      </main>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  );
}

export function ErrorBoundary({ error }: { error: unknown }) {
  let message = i18n.t("error.oops");
  let details = i18n.t("error.unexpected");
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message =
      error.status === 404 ? i18n.t("error.notFound") : i18n.t("error.generic");
    details =
      error.status === 404
        ? i18n.t("error.notFoundDetail")
        : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main>
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre>
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
