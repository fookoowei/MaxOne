import { serverApiWithRefresh } from '@/lib/api/server';

// BFF: forward the reject (+ optional note) to NestJS, mirror the status.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}) as { note?: string });
  const res = await serverApiWithRefresh(`/transactions/${id}/reject`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ note: body.note }),
  });
  if (!res.ok) return new Response(null, { status: res.status });
  return Response.json(await res.json());
}
