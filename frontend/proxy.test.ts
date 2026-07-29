import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';
import { SESSION_USER_COOKIE } from '@/lib/auth/cookie-names';

// Build a NextRequest for a path, optionally carrying a session_user cookie.
function req(path: string, opts?: { session?: boolean }) {
  const headers = new Headers();
  if (opts?.session) {
    const value = encodeURIComponent(JSON.stringify({ id: 'u1', email: 'a@b.c', role: 'finance' }));
    headers.set('cookie', `${SESSION_USER_COOKIE}=${value}`);
  }
  return new NextRequest(new URL(`http://localhost:3200${path}`), { headers });
}

describe('proxy auth-presence guard', () => {
  it('redirects an unauthenticated user from a protected page to /login', () => {
    const res = proxy(req('/'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3200/login');
  });

  it('lets an unauthenticated user reach /login', () => {
    const res = proxy(req('/login'));
    expect(res.headers.get('location')).toBeNull();
  });

  it('lets an authenticated user reach a protected page', () => {
    const res = proxy(req('/', { session: true }));
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects an authenticated user away from /login to the dashboard', () => {
    const res = proxy(req('/login', { session: true }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3200/');
  });
});
