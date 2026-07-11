import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  type LinksFunction,
} from "react-router";

import { Heading, PageLoader, Text, Toaster } from "@repo/ui";
import { COLOR_SCHEME_KEY, ThemeProvider } from "@repo/theme/react";

import { AuthProvider } from "./auth/AuthProvider";
import { I18nSync } from "./components/I18nSync";
import { PwaRegistration } from "./components/PwaRegistration";
import { ThemeColorSync } from "./components/ThemeColorSync";
import { DEFAULT_SITE_NAME, SiteTitleSync } from "./components/SiteTitleSync";
import { TenantBrandingProvider } from "./theme/TenantBrandingProvider";
import { DEV_CONTENT_SECURITY_POLICY } from "./dev-content-security-policy";
import { bootstrapWebPlatform } from "./platform/bootstrap";
import "./i18n";
import { i18n } from "./i18n";
import "./app.css";

export const links: LinksFunction = () => [
  { rel: "manifest", href: "/manifest.webmanifest" },
  { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "icon", href: "/favicon.ico", sizes: "any" },
];

export function meta() {
  return [{ title: DEFAULT_SITE_NAME }];
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* Translucent status bar; page background paints edge-to-edge underneath. */}
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="theme-color" content="transparent" />
        {import.meta.env.DEV ? (
          <meta
            httpEquiv="Content-Security-Policy"
            content={DEV_CONTENT_SECURITY_POLICY}
          />
        ) : null}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;if(localStorage.getItem("${COLOR_SCHEME_KEY}")==="dark"){d.classList.add("dark");d.style.colorScheme="dark"}else{d.style.colorScheme="light"}}catch(e){}})();`,
          }}
        />
        <title>{DEFAULT_SITE_NAME}</title>
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
  return <PageLoader ariaLabel={i18n.t("loading")} />;
}

function AppShell() {
  return (
    <>
      <PwaRegistration />
      <ThemeColorSync />
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
        <TenantBrandingProvider>
          <AppShell />
          <Toaster />
        </TenantBrandingProvider>
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
