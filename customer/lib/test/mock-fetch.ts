import { vi } from 'vitest';

// Replace global fetch for one test: `handler` gets the URL string and returns the Response.
export function mockFetch(handler: (url: string, init?: RequestInit) => Response) {
  return vi.spyOn(global, 'fetch').mockImplementation((input, init) => Promise.resolve(handler(String(input), init)));
}

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
