import { serverApiWithRefresh } from '@/lib/api/server';
import { proxy } from '@/lib/api/proxy';

// BFF: forward the reject (+ optional note) to NestJS, mirror the status.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}) as { note?: string });
  const res = await serverApiWithRefresh(`/transactions/${id}/reject`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ note: body.note }),
  });
  return proxy(res); // M18a: forward the API's status + error envelope
}
