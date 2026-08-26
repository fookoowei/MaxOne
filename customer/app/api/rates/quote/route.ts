import { serverApiWithRefresh } from '@/lib/api/server';

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const from = p.get('from') ?? '';
  const to = p.get('to') ?? '';
  const amount = p.get('amount') ?? '';
  const res = await serverApiWithRefresh(
    `/rates/quote?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}`,
  );
  if (!res.ok) return new Response(null, { status: res.status });
  return Response.json(await res.json());
}
