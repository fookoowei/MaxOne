import { serverApiWithRefresh } from '@/lib/api/server';
import { proxy } from '@/lib/api/proxy';

// BFF: create a wallet in a new currency. Auto-names it "<CODE> wallet".
export async function POST(request: Request) {
  const b = await request.json().catch(() => ({}) as { currency?: string });
  const currency = b.currency ?? '';
  const res = await serverApiWithRefresh('/wallets', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: `${currency} wallet`, currency }),
  });
  return proxy(res); // M18a: forward the API's status + error envelope
}
