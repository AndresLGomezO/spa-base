const bearerSchema = /^Bearer\s+(.+)$/i;

export function extractBearerToken(value: string): string | null {
  const match = value.match(bearerSchema);
  if (!match?.[1]) {
    return null;
  }
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}
