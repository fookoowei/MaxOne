import { serverApiWithRefresh } from '@/lib/api/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const days = new URL(request.url).searchParams.get('days') ?? '7';
  const res = await serverApiWithRefresh(
    `/markets/${encodeURIComponent(id)}/chart?days=${encodeURIComponent(days)}`,
  );
  if (!res.ok) return new Response(null, { status: res.status });
  return Response.json(await res.json());
}
