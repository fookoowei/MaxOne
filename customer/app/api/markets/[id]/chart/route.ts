import { serverApiWithRefresh } from '@/lib/api/server';
import { proxy } from '@/lib/api/proxy';

const RANGES = ['1m', '5m', '15m', '1h', '4h', '1D'];

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asked = new URL(request.url).searchParams.get('range') ?? '1h';
  const range = RANGES.includes(asked) ? asked : '1h'; // the API validates too; don't forward junk
  const res = await serverApiWithRefresh(
    `/markets/${encodeURIComponent(id)}/chart?range=${range}`,
  );
  return proxy(res); // M18a: forward the API's status + error envelope
}
