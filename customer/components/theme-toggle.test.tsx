import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const setTheme = vi.fn();
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'light', setTheme }) }));
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  it('shows the current theme selected and sets the chosen one', async () => {
    render(<ThemeToggle />);
    expect(await screen.findByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(setTheme).toHaveBeenCalledWith('dark');
  });
});
