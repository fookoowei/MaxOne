import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MoneyText } from './money-text';

describe('MoneyText', () => {
  it('renders minor units as currency with tabular figures, symbol de-emphasised', () => {
    render(<MoneyText amountMinor={123456} currency="USD" />);
    const el = screen.getByText((_, node) => node?.tagName === 'SPAN' && node.textContent === '$1,234.56');
    expect(el).toHaveClass('tabular');
    expect(screen.getByText('$')).toHaveClass('text-muted-foreground');
  });
  it('signs and colours only when a tone is given', () => {
    const { rerender } = render(<MoneyText amountMinor={500} currency="USD" tone="positive" />);
    expect(screen.getByText((_, n) => n?.tagName === 'SPAN' && n.textContent === '+$5.00')).toHaveClass('text-status-approved');
    rerender(<MoneyText amountMinor={500} currency="USD" tone="negative" />);
    expect(screen.getByText((_, n) => n?.tagName === 'SPAN' && n.textContent === '−$5.00')).toHaveClass('text-status-rejected');
  });
  it('the currency symbol matches the amount EXACTLY when toned — not grey, not a lighter shade', () => {
    const { rerender } = render(<MoneyText amountMinor={500} currency="USD" tone="positive" />);
    let symbol = screen.getByText('$');
    expect(symbol).not.toHaveClass('text-muted-foreground');
    expect(symbol).not.toHaveClass('opacity-70'); // dimming makes it a different red/green
    expect(symbol.className).toBe(''); // inherits the parent's tone colour verbatim

    rerender(<MoneyText amountMinor={500} currency="USD" tone="negative" />);
    symbol = screen.getByText('$');
    expect(symbol).not.toHaveClass('text-muted-foreground');
    expect(symbol.className).toBe('');
  });
});
