import { serverApiWithRefresh } from '@/lib/api/server';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await serverApiWithRefresh(`/alerts/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return new Response(null, { status: res.status });
}
