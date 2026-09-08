import { serverApiWithRefresh } from '@/lib/api/server';
import { proxy } from '@/lib/api/proxy';

export async function POST() {
  const res = await serverApiWithRefresh('/auth/step-up/passkey/options', { method: 'POST' });
  return proxy(res); // M18a: forward the API's status + error envelope
}
