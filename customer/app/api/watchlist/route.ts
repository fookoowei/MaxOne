import { serverApiWithRefresh } from '@/lib/api/server';
import { proxy } from '@/lib/api/proxy';

export async function POST(request: Request) {
  const b = await request.json().catch(() => ({}) as { symbol?: string; type?: string });
  const res = await serverApiWithRefresh('/watchlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ symbol: b.symbol, type: b.type }),
  });
  return proxy(res); // M18a: forward the API's status + error envelope
}
