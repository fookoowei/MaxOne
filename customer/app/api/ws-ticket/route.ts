import { serverApiWithRefresh } from '@/lib/api/server';

// Mint a short-lived WS ticket (authed by the httpOnly cookie), so the browser can open a
// socket directly to the backend. The long-lived tokens are never exposed to the browser.
export async function POST() {
  const res = await serverApiWithRefresh('/auth/ws-ticket', { method: 'POST' });
  if (!res.ok) return new Response(null, { status: res.status });
  return Response.json(await res.json());
}
