import { serverApiWithRefresh } from '@/lib/api/server';
import { proxy } from '@/lib/api/proxy';

// BFF: forward a status change to NestJS (user.manage + SoD enforced there), mirror the status.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await request.json().catch(() => ({}) as { status?: string });
  const res = await serverApiWithRefresh(`/users/${id}/status`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: b.status }),
  });
  return proxy(res); // M18a: forward the API's status + error envelope
}
