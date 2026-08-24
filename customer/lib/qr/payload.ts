const PREFIX = 'maxone:';
const HANDLE_RE = /^[a-z][a-z0-9_]{2,19}$/;

export function encodeQr(handle: string): string {
  return `${PREFIX}${handle.toLowerCase()}`;
}

// Returns the handle for a valid MaxOne payload, or null for anything else.
export function parseQr(text: string): string | null {
  if (!text.startsWith(PREFIX)) return null;
  const handle = text.slice(PREFIX.length).toLowerCase();
  return HANDLE_RE.test(handle) ? handle : null;
}
