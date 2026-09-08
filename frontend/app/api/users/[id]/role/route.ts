import { serverApiWithRefresh } from '@/lib/api/server';
import { proxy } from '@/lib/api/proxy';

// BFF: forward a role change to NestJS, mirror the status.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await request.json().catch(() => ({}) as { role?: string });
  const res = await serverApiWithRefresh(`/users/${id}/role`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ role: b.role }),
  });
  return proxy(res); // M18a: forward the API's status + error envelope
}
