import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransferForm } from './transfer-form';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const stepUpWithPasskey = vi.fn();
vi.mock('@/lib/passkeys/client', () => ({ stepUpWithPasskey: () => stepUpWithPasskey() }));

beforeEach(() => {
  push.mockReset();
  vi.restoreAllMocks();
});

function mockFetch(handler: (url: string) => Response) {
  return vi.spyOn(global, 'fetch').mockImplementation((input) =>
    Promise.resolve(handler(String(input))),
  );
}

describe('TransferForm', () => {
  it('resolves a handle, then sends the transfer in cents and redirects', async () => {
    const fetchSpy = mockFetch((url) => {
      if (url.includes('/api/wallets/lookup')) {
        return new Response(
          JSON.stringify({ walletId: 'w2', currency: 'USD', recipientName: 'Alice Lee' }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ id: 't1' }), { status: 200 });
    });
    render(<TransferForm myWalletId="w1" myCurrency="USD" />);

    await userEvent.type(screen.getByLabelText(/handle/i), 'alice');
    await userEvent.click(screen.getByRole('button', { name: /find/i }));
    expect(await screen.findByText(/alice lee/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/amount/i), '50');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    const transferCall = fetchSpy.mock.calls.find(([u]) => String(u).includes('/transfers'))!;
    expect(String(transferCall[0])).toBe('/api/wallets/w1/transfers');
    expect(JSON.parse((transferCall[1] as RequestInit).body as string)).toMatchObject({
      toWalletId: 'w2',
      amount: 5000,
    });
  });

  it('blocks sending to yourself', async () => {
    mockFetch(() =>
      new Response(JSON.stringify({ walletId: 'w1', currency: 'USD', recipientName: 'Me Myself' }), {
        status: 200,
      }),
    );
    render(<TransferForm myWalletId="w1" myCurrency="USD" />);

    await userEvent.type(screen.getByLabelText(/handle/i), 'me');
    await userEvent.click(screen.getByRole('button', { name: /find/i }));

    expect(await screen.findByText(/can't send to yourself/i)).toBeInTheDocument();
  });

  it('shows an error when the handle is not found', async () => {
    mockFetch(() => new Response(null, { status: 404 }));
    render(<TransferForm myWalletId="w1" myCurrency="USD" />);

    await userEvent.type(screen.getByLabelText(/handle/i), 'ghost');
    await userEvent.click(screen.getByRole('button', { name: /find/i }));

    expect(await screen.findByText(/no one found/i)).toBeInTheDocument();
  });

  it('step-up: a 403 STEP_UP_REQUIRED prompts for a code, then retries with the grant', async () => {
    let transferCalls = 0;
    const fetchSpy = mockFetch((url) => {
      if (url.includes('/api/wallets/lookup')) {
        return new Response(JSON.stringify({ walletId: 'w2', currency: 'USD', recipientName: 'Alice Lee' }), { status: 200 });
      }
      if (url.includes('/api/auth/step-up')) {
        return new Response(JSON.stringify({ stepUpToken: 'grant-1' }), { status: 200 });
      }
      transferCalls += 1;
      return transferCalls === 1
        ? new Response(JSON.stringify({ code: 'STEP_UP_REQUIRED' }), { status: 403 })
        : new Response(JSON.stringify({ id: 't1' }), { status: 200 });
    });
    render(<TransferForm myWalletId="w1" myCurrency="USD" />);

    await userEvent.type(screen.getByLabelText(/handle/i), 'alice');
    await userEvent.click(screen.getByRole('button', { name: /find/i }));
    await screen.findByText(/alice lee/i);
    await userEvent.type(screen.getByLabelText(/amount/i), '50');
    await userEvent.click(screen.getByRole('button', { name: /^send$/i }));

    // First attempt is refused → the code prompt appears, no redirect yet.
    const codeInput = await screen.findByLabelText(/authentication code/i);
    expect(push).not.toHaveBeenCalled();

    await userEvent.type(codeInput, '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify & send/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    const transfers = fetchSpy.mock.calls.filter(([u]) => String(u).includes('/transfers'));
    expect(transfers).toHaveLength(2);
    expect((transfers[1][1] as RequestInit).headers).toMatchObject({ 'x-step-up-token': 'grant-1' });
    expect((transfers[0][1] as RequestInit).headers).not.toHaveProperty('x-step-up-token');
  });

  it('step-up: "Use passkey instead" retries the transfer with the passkey grant', async () => {
    stepUpWithPasskey.mockResolvedValue('grant-pk');
    let transferCalls = 0;
    const fetchSpy = mockFetch((url) => {
      if (url.includes('/api/wallets/lookup')) {
        return new Response(JSON.stringify({ walletId: 'w2', currency: 'USD', recipientName: 'Alice Lee' }), { status: 200 });
      }
      transferCalls += 1;
      return transferCalls === 1
        ? new Response(JSON.stringify({ code: 'STEP_UP_REQUIRED' }), { status: 403 })
        : new Response(JSON.stringify({ id: 't1' }), { status: 200 });
    });
    render(<TransferForm myWalletId="w1" myCurrency="USD" />);
    await userEvent.type(screen.getByLabelText(/handle/i), 'alice');
    await userEvent.click(screen.getByRole('button', { name: /find/i }));
    await screen.findByText(/alice lee/i);
    await userEvent.type(screen.getByLabelText(/amount/i), '50');
    await userEvent.click(screen.getByRole('button', { name: /^send$/i }));
    await screen.findByLabelText(/authentication code/i);

    await userEvent.click(screen.getByRole('button', { name: /use passkey instead/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    const transfers = fetchSpy.mock.calls.filter(([u]) => String(u).includes('/transfers'));
    expect((transfers[1][1] as RequestInit).headers).toMatchObject({ 'x-step-up-token': 'grant-pk' });
  });

  it('sends an Idempotency-Key and REUSES it when retrying after a failure', async () => {
    let transferCalls = 0;
    const fetchSpy = mockFetch((url) => {
      if (url.includes('/api/wallets/lookup')) {
        return new Response(JSON.stringify({ walletId: 'w2', currency: 'USD', recipientName: 'Alice Lee' }), { status: 200 });
      }
      transferCalls += 1;
      return transferCalls === 1
        ? new Response(null, { status: 500 }) // network/server blip
        : new Response(JSON.stringify({ id: 't1' }), { status: 200 });
    });
    render(<TransferForm myWalletId="w1" myCurrency="USD" />);
    await userEvent.type(screen.getByLabelText(/handle/i), 'alice');
    await userEvent.click(screen.getByRole('button', { name: /find/i }));
    await screen.findByText(/alice lee/i);
    await userEvent.type(screen.getByLabelText(/amount/i), '50');

    await userEvent.click(screen.getByRole('button', { name: /^send$/i }));
    await screen.findByText(/could not send/i);
    await userEvent.click(screen.getByRole('button', { name: /^send$/i })); // user retries
    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));

    const transfers = fetchSpy.mock.calls.filter(([u]) => String(u).includes('/transfers'));
    const k1 = ((transfers[0][1] as RequestInit).headers as Record<string, string>)['idempotency-key'];
    const k2 = ((transfers[1][1] as RequestInit).headers as Record<string, string>)['idempotency-key'];
    expect(k1).toMatch(/^[0-9a-f-]{36}$/);
    expect(k2).toBe(k1); // same logical operation → same key → the server can never double-charge
  });

  it('a 409 (key already used) tells the user the send may have already gone through', async () => {
    mockFetch((url) => {
      if (url.includes('/api/wallets/lookup')) {
        return new Response(JSON.stringify({ walletId: 'w2', currency: 'USD', recipientName: 'Alice Lee' }), { status: 200 });
      }
      return new Response(JSON.stringify({ message: 'Idempotency-Key was already used for a different request' }), { status: 409 });
    });
    render(<TransferForm myWalletId="w1" myCurrency="USD" />);
    await userEvent.type(screen.getByLabelText(/handle/i), 'alice');
    await userEvent.click(screen.getByRole('button', { name: /find/i }));
    await screen.findByText(/alice lee/i);
    await userEvent.type(screen.getByLabelText(/amount/i), '50');
    await userEvent.click(screen.getByRole('button', { name: /^send$/i }));

    expect(await screen.findByText(/may have already gone through/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
