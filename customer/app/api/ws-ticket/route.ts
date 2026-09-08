import { serverApiWithRefresh } from '@/lib/api/server';
import { proxy } from '@/lib/api/proxy';

// Mint a short-lived WS ticket (authed by the httpOnly cookie), so the browser can open a
// socket directly to the backend. The long-lived tokens are never exposed to the browser.
export async function POST() {
  const res = await serverApiWithRefresh('/auth/ws-ticket', { method: 'POST' });
  return proxy(res); // M18a: forward the API's status + error envelope
}
