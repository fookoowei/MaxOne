import { serverApiWithRefresh } from '@/lib/api/server';
import { proxy } from '@/lib/api/proxy';

export async function POST(request: Request) {
  const b = await request.json().catch(() => ({}) as Record<string, unknown>);
  const res = await serverApiWithRefresh('/auth/2fa/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code: b.code }),
  });
  return proxy(res); // M18a: forward the API's status + error envelope // { recoveryCodes } — shown once
}
