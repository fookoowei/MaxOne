import { serverApiWithRefresh } from '@/lib/api/server';

export async function POST() {
  const res = await serverApiWithRefresh('/auth/step-up/passkey/options', { method: 'POST' });
  if (!res.ok) return new Response(null, { status: res.status });
  return Response.json(await res.json());
}
