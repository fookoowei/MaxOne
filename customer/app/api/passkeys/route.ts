import { serverApiWithRefresh } from '@/lib/api/server';
import { proxy } from '@/lib/api/proxy';

export async function GET() {
  const res = await serverApiWithRefresh('/auth/passkeys');
  return proxy(res); // M18a: forward the API's status + error envelope
}
