import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, toastApiError } from './client';

const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }));

const reply = (status: number, body: string | null, type = 'application/json') =>
  new Response(body, { status, headers: body ? { 'content-type': type } : {} });

describe('apiRequest', () => {
  afterEach(() => vi.restoreAllMocks());

  it('ok → parsed data', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(reply(200, '{"id":"w1"}'));
    expect(await apiRequest<{ id: string }>('/api/x')).toEqual({ ok: true, status: 200, data: { id: 'w1' } });
  });

  it('API envelope → code + message + details', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      reply(400, '{"statusCode":400,"code":"VALIDATION_FAILED","message":"Validation failed","details":["amount must be positive"],"path":"/x","timestamp":"t"}'),
    );
    const r = await apiRequest('/api/x');
    expect(r).toEqual({
      ok: false,
      error: { status: 400, code: 'VALIDATION_FAILED', message: 'Validation failed', details: ['amount must be positive'] },
    });
  });

  it('non-JSON error body → HTTP_<status> with a generic message', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(reply(502, 'Bad Gateway', 'text/plain'));
    const r = await apiRequest('/api/x');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toEqual({ status: 502, code: 'HTTP_502', message: 'Something went wrong. Please try again.' });
  });

  it('empty 204 → ok with null data', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(reply(204, null));
    expect(await apiRequest('/api/x')).toEqual({ ok: true, status: 204, data: null });
  });

  it('network failure → NETWORK, never throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    const r = await apiRequest('/api/x');
    expect(r).toEqual({ ok: false, error: { status: 0, code: 'NETWORK', message: 'Check your connection and try again.' } });
  });
});

describe('toastApiError', () => {
  it('shows the API message, or the override for that code', () => {
    toastApiError({ status: 409, code: 'ALREADY_REVIEWED', message: 'Transaction already reviewed' });
    expect(toastError).toHaveBeenLastCalledWith('Transaction already reviewed', { description: undefined });
    toastApiError({ status: 409, code: 'ALREADY_REVIEWED', message: 'x' }, { ALREADY_REVIEWED: 'Someone else got there first.' });
    expect(toastError).toHaveBeenLastCalledWith('Someone else got there first.', { description: undefined });
  });
});
