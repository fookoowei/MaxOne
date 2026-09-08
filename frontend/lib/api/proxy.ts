// BFF → browser: forward the API's response as-is (status, JSON body, content-type). Before M18a
// every write route did `new Response(null, { status })` on error, which threw away the M15c error
// envelope — so the browser could only guess from the status code. Now `apiRequest` in the browser
// reads the same `{ code, message, details }` the API produced.
export async function proxy(res: Response): Promise<Response> {
  const body = await res.text();
  return new Response(body || null, {
    status: res.status,
    headers: body ? { 'content-type': res.headers.get('content-type') ?? 'application/json' } : {},
  });
}
