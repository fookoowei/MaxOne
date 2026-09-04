import { serverApiWithRefresh } from '@/lib/api/server';

export async function GET() {
  const res = await serverApiWithRefresh('/auth/passkeys');
  if (!res.ok) return new Response(null, { status: res.status });
  return Response.json(await res.json());
}
