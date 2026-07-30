import { serverApiWithRefresh } from '@/lib/api/server';

// BFF: forward the approve to NestJS (with silent refresh-retry), mirror the status.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await serverApiWithRefresh(`/transactions/${id}/approve`, { method: 'POST' });
  if (!res.ok) return new Response(null, { status: res.status });
  return Response.json(await res.json());
}
