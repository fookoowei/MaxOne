import { serverApiWithRefresh } from '@/lib/api/server';

export async function DELETE(_request: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const res = await serverApiWithRefresh(`/portfolio/${encodeURIComponent(symbol)}`, { method: 'DELETE' });
  return new Response(null, { status: res.status });
}
