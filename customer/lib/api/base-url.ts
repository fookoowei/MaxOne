// Builds an absolute NestJS URL for the BFF's server-to-server calls. The BFF
// talks to the backend directly (never via the browser), so this base is a
// server-only env var, not a NEXT_PUBLIC_ one. Throw on misconfig rather than
// silently calling the wrong host.
export function apiUrl(path: string): string {
  const base = process.env.API_BASE_URL;
  if (!base) {
    throw new Error('API_BASE_URL is not set');
  }
  return `${base}${path}`;
}
