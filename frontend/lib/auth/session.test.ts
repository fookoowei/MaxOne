import { describe, it, expect, vi, beforeEach } from 'vitest';

// A single fake cookie store shared by the mocked next/headers.cookies().
const store = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => store),
}));

import {
  setAuthCookies,
  refreshAuthCookies,
  clearAuthCookies,
  getSessionUser,
} from './session';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  SESSION_USER_COOKIE,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
} from './cookie-names';

const user = { id: 'u1', email: 'finance@wallet.local', role: 'finance' };
const tokens = { accessToken: 'a.jwt', refreshToken: 'r-opaque' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('session cookies', () => {
  it('setAuthCookies writes access, refresh, and session_user, all httpOnly', async () => {
    await setAuthCookies(user, tokens);

    expect(store.set).toHaveBeenCalledTimes(3);
    expect(store.set).toHaveBeenCalledWith(
      ACCESS_COOKIE,
      'a.jwt',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', maxAge: ACCESS_MAX_AGE }),
    );
    expect(store.set).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      'r-opaque',
      expect.objectContaining({ httpOnly: true, maxAge: REFRESH_MAX_AGE }),
    );
    expect(store.set).toHaveBeenCalledWith(
      SESSION_USER_COOKIE,
      JSON.stringify(user),
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('refreshAuthCookies rotates only the two token cookies, not session_user', async () => {
    await refreshAuthCookies({ accessToken: 'a2', refreshToken: 'r2' });

    expect(store.set).toHaveBeenCalledTimes(2);
    expect(store.set).toHaveBeenCalledWith(
      ACCESS_COOKIE,
      'a2',
      expect.objectContaining({ maxAge: ACCESS_MAX_AGE }),
    );
    expect(store.set).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      'r2',
      expect.objectContaining({ maxAge: REFRESH_MAX_AGE }),
    );
    expect(store.set).not.toHaveBeenCalledWith(
      SESSION_USER_COOKIE,
      expect.anything(),
      expect.anything(),
    );
  });

  it('clearAuthCookies deletes all three', async () => {
    await clearAuthCookies();

    expect(store.delete).toHaveBeenCalledWith(ACCESS_COOKIE);
    expect(store.delete).toHaveBeenCalledWith(REFRESH_COOKIE);
    expect(store.delete).toHaveBeenCalledWith(SESSION_USER_COOKIE);
  });

  it('getSessionUser parses the session_user cookie JSON', async () => {
    store.get.mockReturnValue({ value: JSON.stringify(user) });
    expect(await getSessionUser()).toEqual(user);
  });

  it('getSessionUser returns null when the cookie is absent', async () => {
    store.get.mockReturnValue(undefined);
    expect(await getSessionUser()).toBeNull();
  });

  it('getSessionUser returns null on malformed JSON instead of throwing', async () => {
    store.get.mockReturnValue({ value: 'not-json{' });
    expect(await getSessionUser()).toBeNull();
  });
});
