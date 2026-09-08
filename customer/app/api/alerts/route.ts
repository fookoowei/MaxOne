import { serverApiWithRefresh } from '@/lib/api/server';
import { proxy } from '@/lib/api/proxy';

export async function POST(request: Request) {
  const b = await request.json().catch(() => ({}) as Record<string, unknown>);
  const res = await serverApiWithRefresh('/alerts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      symbol: b.symbol,
      type: b.type,
      targetPrice: b.targetPrice,
      direction: b.direction,
    }),
  });
  return proxy(res); // M18a: forward the API's status + error envelope
}
