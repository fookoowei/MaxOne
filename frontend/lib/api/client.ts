import { toast } from 'sonner';

// The API's one error shape (M15c). BFF routes forward it verbatim (see lib/api/proxy.ts).
export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: string[];
}
export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; error: ApiError };

const GENERIC = 'Something went wrong. Please try again.';

/**
 * The one way client code talks to a BFF route. Never throws: a network failure, a non-JSON body
 * and an API error envelope all come back as `{ ok: false, error }` with a code the caller can
 * branch on and a message a person can read.
 */
export async function apiRequest<T = unknown>(input: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    return { ok: false, error: { status: 0, code: 'NETWORK', message: 'Check your connection and try again.' } };
  }
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  if (res.ok) return { ok: true, status: res.status, data: body as T };
  const env = body as Partial<ApiError> | null;
  return {
    ok: false,
    error: {
      status: res.status,
      code: typeof env?.code === 'string' ? env.code : `HTTP_${res.status}`,
      message: typeof env?.message === 'string' ? env.message : GENERIC,
      ...(Array.isArray(env?.details) ? { details: env.details } : {}),
    },
  };
}

/** Show an API error as a toast. `overrides` swaps the API's wording for friendlier copy by code. */
export function toastApiError(error: ApiError, overrides: Partial<Record<string, string>> = {}): void {
  toast.error(overrides[error.code] ?? error.message, {
    description: error.details?.length ? error.details.join(' ') : undefined,
  });
}
