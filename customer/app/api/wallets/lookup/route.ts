import { serverApiWithRefresh } from '@/lib/api/server';
import { proxy } from '@/lib/api/proxy';

// BFF: resolve a @handle to a recipient wallet. /api routes bypass the proxy, so use
// the refresh-capable path to self-heal an expired access token.
export async function GET(request: Request) {
  const handle = new URL(request.url).searchParams.get('handle') ?? '';
  const res = await serverApiWithRefresh(`/wallets/lookup?handle=${encodeURIComponent(handle)}`);
  return proxy(res); // M18a: forward the API's status + error envelope
}
