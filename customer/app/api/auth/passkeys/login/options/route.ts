import { apiUrl } from '@/lib/api/base-url';
import { proxy } from '@/lib/api/proxy';

// Public: usernameless sign-in starts before any session exists.
export async function POST() {
  const res = await fetch(apiUrl('/auth/passkeys/login/options'), { method: 'POST' });
  return proxy(res); // M18a: forward the API's status + error envelope
}
