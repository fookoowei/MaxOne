import { serverApiWithRefresh } from '@/lib/api/server';
import { proxy } from '@/lib/api/proxy';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const days = new URL(request.url).searchParams.get('days') ?? '7';
  const res = await serverApiWithRefresh(
    `/markets/${encodeURIComponent(id)}/chart?days=${encodeURIComponent(days)}`,
  );
  return proxy(res); // M18a: forward the API's status + error envelope
}
