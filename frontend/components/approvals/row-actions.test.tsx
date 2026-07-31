import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import { RowActions } from './row-actions';

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('RowActions permission gating', () => {
  it('disables both actions when the role lacks the row-type permission', () => {
    render(<RowActions id="t1" type="withdrawal" role="support" />); // support: view only
    expect(screen.getByRole('button', { name: /approve/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /reject/i })).toBeDisabled();
  });

  it('enables actions for a permitted role', () => {
    render(<RowActions id="t1" type="deposit" role="finance" />); // finance: deposit.approve
    expect(screen.getByRole('button', { name: /approve/i })).toBeEnabled();
  });
});

describe('RowActions behavior', () => {
  it('approves via the BFF route and refreshes', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    render(<RowActions id="t1" type="deposit" role="finance" />);

    fireEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/transactions/t1/approve',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('rejects with a note via the BFF route and refreshes', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    render(<RowActions id="t1" type="deposit" role="finance" />);

    fireEvent.click(screen.getByRole('button', { name: /^reject$/i })); // open the note form
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'dupe' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm reject/i }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const call = fetchMock.mock.calls.find((c) => String(c[0]).endsWith('/reject'))!;
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({ note: 'dupe' });
  });
});
