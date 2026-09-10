import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const stepUpWithPasskey = vi.fn();
vi.mock('@/lib/passkeys/client', () => ({ stepUpWithPasskey: () => stepUpWithPasskey() }));
const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() } }));

import { SendMoneyWizard } from './send-money-wizard';

beforeEach(() => {
  push.mockReset();
  toastError.mockReset();
  vi.restoreAllMocks();
});

const alice = () => new Response(JSON.stringify({ walletId: 'w2', currency: 'USD', recipientName: 'Alice Lee' }), { status: 200, headers: { 'content-type': 'application/json' } });
const ok = () => new Response(JSON.stringify({ id: 'abc12345-0' }), { status: 201, headers: { 'content-type': 'application/json' } });
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
function mockFetch(handler: (url: string) => Response) {
  return vi.spyOn(global, 'fetch').mockImplementation((input) => Promise.resolve(handler(String(input))));
}
function wizard() {
  return render(<SendMoneyWizard myWalletId="w1" myCurrency="USD" balance={125000} />);
}
async function fillDetails(amount = '50') {
  await userEvent.type(screen.getByLabelText(/send to/i), 'alice');
  await screen.findByText(/alice lee/i);
  await userEvent.type(screen.getByLabelText(/^amount/i), amount);
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
}

describe('SendMoneyWizard', () => {
  it('resolves the handle as you type, confirms, sends cents, shows the receipt', async () => {
    const fetchSpy = mockFetch((url) => (url.includes('/api/wallets/lookup') ? alice() : ok()));
    wizard();
    await fillDetails();
    expect(screen.getByText('Alice Lee · @alice')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /confirm and send \$50\.00/i }));
    expect(await screen.findByText('Sent')).toBeInTheDocument();
    expect(screen.getByText('#ABC12345')).toBeInTheDocument();
    const transfer = fetchSpy.mock.calls.find(([u]) => String(u).includes('/transfers'))!;
    expect(String(transfer[0])).toBe('/api/wallets/w1/transfers');
    expect(JSON.parse((transfer[1] as RequestInit).body as string)).toMatchObject({ toWalletId: 'w2', amount: 5000 });
    await userEvent.click(screen.getByRole('button', { name: /back to home/i }));
    expect(push).toHaveBeenCalledWith('/');
  });

  it('blocks sending to yourself and disables Continue', async () => {
    mockFetch(() => json(200, { walletId: 'w1', currency: 'USD', recipientName: 'Me Myself' }));
    wizard();
    await userEvent.type(screen.getByLabelText(/send to/i), 'meme');
    expect(await screen.findByText(/can't send to yourself/i)).toBeInTheDocument();
    // Dismiss the dropdown (while it is open the rest of the page is aria-hidden, as with any popup).
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled());
  });

  it('says when nobody has that handle', async () => {
    mockFetch(() => new Response(null, { status: 404 }));
    wizard();
    await userEvent.type(screen.getByLabelText(/send to/i), 'ghost');
    expect(await screen.findByText(/no one found/i)).toBeInTheDocument();
  });

  it('offers the match in a dropdown; picking it fills the handle and pins the recipient', async () => {
    mockFetch(() => alice());
    wizard();
    const box = screen.getByRole('combobox', { name: /send to/i });
    await userEvent.type(box, 'alice');
    const option = await screen.findByRole('option', { name: /alice lee/i });
    expect(box).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(option);
    expect(box).toHaveValue('alice');
    await waitFor(() => expect(box).toHaveAttribute('aria-expanded', 'false'));
    expect(screen.getByRole('status')).toHaveTextContent('@alice · USD wallet'); // pinned under the field
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('is keyboard operable: ArrowDown + Enter picks the match', async () => {
    mockFetch(() => alice());
    wizard();
    const box = screen.getByRole('combobox', { name: /send to/i });
    await userEvent.type(box, 'alice');
    await screen.findByRole('option', { name: /alice lee/i });
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(box).toHaveAttribute('aria-expanded', 'false'));
    expect(screen.getByRole('status')).toHaveTextContent('@alice · USD wallet');
  });

  it('shows a looking-up status in the dropdown before the lookup resolves', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(() => new Promise<Response>(() => {})); // never resolves
    wizard();
    await userEvent.type(screen.getByRole('combobox', { name: /send to/i }), 'alice');
    expect(await screen.findByText(/looking up @alice/i)).toBeInTheDocument();
  });

  it('step-up: a 403 STEP_UP_REQUIRED prompts for a code on the confirm step, then retries with the grant', async () => {
    let transfers = 0;
    const fetchSpy = mockFetch((url) => {
      if (url.includes('/api/wallets/lookup')) return alice();
      if (url.includes('/api/auth/step-up')) return json(200, { stepUpToken: 'grant-1' });
      return ++transfers === 1 ? json(403, { code: 'STEP_UP_REQUIRED', message: 'Step-up required' }) : ok();
    });
    wizard();
    await fillDetails();
    await userEvent.click(screen.getByRole('button', { name: /confirm and send/i }));
    const code = await screen.findByLabelText(/authentication code/i);
    expect(screen.queryByText('Sent')).toBeNull();
    await userEvent.type(code, '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify and send/i }));
    expect(await screen.findByText('Sent')).toBeInTheDocument();
    const calls = fetchSpy.mock.calls.filter(([u]) => String(u).includes('/transfers'));
    expect(calls).toHaveLength(2);
    expect((calls[1][1] as RequestInit).headers).toMatchObject({ 'x-step-up-token': 'grant-1' });
    expect((calls[0][1] as RequestInit).headers).not.toHaveProperty('x-step-up-token');
  });

  it('step-up: "Use passkey instead" retries with the passkey grant', async () => {
    stepUpWithPasskey.mockResolvedValue('grant-pk');
    let transfers = 0;
    const fetchSpy = mockFetch((url) => (url.includes('/api/wallets/lookup') ? alice() : ++transfers === 1 ? json(403, { code: 'STEP_UP_REQUIRED', message: 'x' }) : ok()));
    wizard();
    await fillDetails();
    await userEvent.click(screen.getByRole('button', { name: /confirm and send/i }));
    await screen.findByLabelText(/authentication code/i);
    await userEvent.click(screen.getByRole('button', { name: /use passkey instead/i }));
    expect(await screen.findByText('Sent')).toBeInTheDocument();
    const calls = fetchSpy.mock.calls.filter(([u]) => String(u).includes('/transfers'));
    expect((calls[1][1] as RequestInit).headers).toMatchObject({ 'x-step-up-token': 'grant-pk' });
  });

  it('sends an Idempotency-Key and REUSES it when retrying after a failure', async () => {
    let transfers = 0;
    const fetchSpy = mockFetch((url) => (url.includes('/api/wallets/lookup') ? alice() : ++transfers === 1 ? new Response(null, { status: 500 }) : ok()));
    wizard();
    await fillDetails();
    await userEvent.click(screen.getByRole('button', { name: /confirm and send/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/could not send/i), expect.anything()));
    await userEvent.click(screen.getByRole('button', { name: /confirm and send/i })); // user retries
    expect(await screen.findByText('Sent')).toBeInTheDocument();
    const calls = fetchSpy.mock.calls.filter(([u]) => String(u).includes('/transfers'));
    const k1 = ((calls[0][1] as RequestInit).headers as Record<string, string>)['idempotency-key'];
    const k2 = ((calls[1][1] as RequestInit).headers as Record<string, string>)['idempotency-key'];
    expect(k1).toMatch(/^[0-9a-f-]{36}$/);
    expect(k2).toBe(k1);
  });

  it('a 409 (key already used) says the send may have already gone through, and stays on confirm', async () => {
    mockFetch((url) => (url.includes('/api/wallets/lookup') ? alice() : json(409, { code: 'IDEMPOTENCY_KEY_REUSED', message: 'Idempotency-Key was already used' })));
    wizard();
    await fillDetails();
    await userEvent.click(screen.getByRole('button', { name: /confirm and send/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/may have already gone through/i), expect.anything()));
    expect(screen.queryByText('Sent')).toBeNull();
  });
});
