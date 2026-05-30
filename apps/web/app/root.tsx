import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  type LinksFunction,
} from "react-router";

import { Heading, Text, Toaster } from "@repo/ui";
import { COLOR_SCHEME_KEY, ThemeProvider } from "@repo/theme/react";

import { AuthProvider } from "./auth/AuthProvider";
import { I18nSync } from "./components/I18nSync";
import { SiteTitleSync } from "./components/SiteTitleSync";
import { bootstrapWebPlatform } from "./platform/bootstrap";
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
      <body suppressHydrationWarning>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function HydrateFallback() {
  return (
    <main aria-busy="true" className="mx-auto max-w-2xl px-4 py-8">
      <Text>{i18n.t("loading")}</Text>
    </main>
  );
}

function AppShell() {
  return (
    <>
      <I18nSync />
      <SiteTitleSync />
      <Outlet />
    </>
  );
}

export default function App() {
  bootstrapWebPlatform();
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
        <Toaster />
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
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Heading level={1}>{message}</Heading>
      <Text>{details}</Text>
      {stack && (
        <pre>
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
