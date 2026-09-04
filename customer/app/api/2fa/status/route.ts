import { serverApiWithRefresh } from '@/lib/api/server';

export async function GET() {
  const res = await serverApiWithRefresh('/auth/2fa/status');
  if (!res.ok) return new Response(null, { status: res.status });
  return Response.json(await res.json()); // { enabled }
}
