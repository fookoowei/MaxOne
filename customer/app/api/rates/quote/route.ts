import { serverApiWithRefresh } from '@/lib/api/server';
import { proxy } from '@/lib/api/proxy';

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const from = p.get('from') ?? '';
  const to = p.get('to') ?? '';
  const amount = p.get('amount') ?? '';
  const res = await serverApiWithRefresh(
    `/rates/quote?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}`,
  );
  return proxy(res); // M18a: forward the API's status + error envelope
}
