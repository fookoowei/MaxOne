import { cookies } from 'next/headers';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  SESSION_USER_COOKIE,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
  cookieOptions,
  type SessionUser,
} from './cookie-names';

// Shape returned by the NestJS token API on login/refresh.
interface Tokens {
  accessToken: string;
  refreshToken: string;
}

// Called from the login Route Handler after NestJS authenticates the user:
// stamp the access + refresh tokens and the non-sensitive identity mirror.
export async function setAuthCookies(user: SessionUser, tokens: Tokens): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.accessToken, cookieOptions(ACCESS_MAX_AGE));
  store.set(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(REFRESH_MAX_AGE));
  // session_user lives as long as the refresh window so the shell survives an
  // access-token expiry (which a silent refresh then heals).
  store.set(SESSION_USER_COOKIE, JSON.stringify(user), cookieOptions(REFRESH_MAX_AGE));
}

// Called after a silent refresh: only the tokens rotate — the identity is
// unchanged, and /auth/refresh returns tokens only, not the user.
export async function refreshAuthCookies(tokens: Tokens): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.accessToken, cookieOptions(ACCESS_MAX_AGE));
  store.set(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(REFRESH_MAX_AGE));
}

// Called on logout: drop every trace of the session.
export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
  store.delete(SESSION_USER_COOKIE);
}

// Read the identity mirror for rendering. Returns null when absent or if the
// cookie was tampered into non-JSON — render must never crash on bad input.
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(SESSION_USER_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}
