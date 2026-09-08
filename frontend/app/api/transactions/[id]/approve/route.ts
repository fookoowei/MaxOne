import { serverApiWithRefresh } from '@/lib/api/server';
import { proxy } from '@/lib/api/proxy';

// BFF: forward the approve to NestJS (with silent refresh-retry), mirror the status.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await serverApiWithRefresh(`/transactions/${id}/approve`, { method: 'POST' });
  return proxy(res); // M18a: forward the API's status + error envelope
}
