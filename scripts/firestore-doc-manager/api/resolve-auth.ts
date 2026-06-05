import { readFileSync } from "node:fs";

export interface ApiAuthHeaders {
  readonly authorization: string;
  readonly appCheck: string;
}

function extractCurlHeader(curl: string, headerName: string): string | undefined {
  const pattern = new RegExp(
    `-H\\s+['"]${headerName}:\\s*([^'"]+)['"]`,
    "i",
  );
  const match = curl.match(pattern);
  return match?.[1]?.trim();
}

function extractAuthFromCurlFile(curlFile: string): ApiAuthHeaders {
  const curl = readFileSync(curlFile, "utf8");
  const authorization = extractCurlHeader(curl, "authorization");
  const appCheck = extractCurlHeader(curl, "x-firebase-appcheck");

  if (!authorization) {
    throw new Error(
      `Could not find authorization header in curl file: ${curlFile}`,
    );
  }
  if (!appCheck) {
    throw new Error(
      `Could not find x-firebase-appcheck header in curl file: ${curlFile}`,
    );
  }

  return {
    authorization: authorization.startsWith("Bearer ")
      ? authorization
      : `Bearer ${authorization}`,
    appCheck,
  };
}

export function resolveApiAuth(input: {
  readonly token?: string;
  readonly appCheck?: string;
  readonly curlFile?: string;
}): ApiAuthHeaders {
  if (input.curlFile) {
    return extractAuthFromCurlFile(input.curlFile);
  }

  const token = input.token?.trim();
  const appCheck = input.appCheck?.trim();

  if (!token || !appCheck) {
    throw new Error(
      "Provide --token and --app-check (or API_ID_TOKEN and API_APP_CHECK_TOKEN), or --curl-file.",
    );
  }

  return {
    authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
    appCheck,
  };
}
