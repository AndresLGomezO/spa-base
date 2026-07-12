import { GMAIL_OAUTH_SCOPES } from "./collections.js";

export interface GmailOAuthConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
}

export function buildGmailAuthorizeUrl(
  config: GmailOAuthConfig,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GMAIL_OAUTH_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface GmailTokenResponse {
  readonly access_token: string;
  readonly expires_in: number;
  readonly refresh_token?: string;
  readonly scope?: string;
  readonly token_type: string;
}

export async function exchangeGmailAuthCode(
  config: GmailOAuthConfig,
  code: string,
): Promise<GmailTokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Gmail OAuth code exchange failed: ${response.status} ${body.slice(0, 300)}`,
    );
  }

  return (await response.json()) as GmailTokenResponse;
}

export async function refreshGmailAccessToken(
  config: Pick<GmailOAuthConfig, "clientId" | "clientSecret">,
  refreshToken: string,
): Promise<GmailTokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Gmail OAuth refresh failed: ${response.status} ${body.slice(0, 300)}`,
    );
  }

  return (await response.json()) as GmailTokenResponse;
}
