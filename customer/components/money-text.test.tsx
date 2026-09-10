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
  it('the currency symbol takes the tone colour too — grey next to a green number reads as broken', () => {
    const { rerender } = render(<MoneyText amountMinor={500} currency="USD" tone="positive" />);
    expect(screen.getByText('$')).not.toHaveClass('text-muted-foreground');
    expect(screen.getByText('$')).toHaveClass('opacity-70'); // lighter than the value, same hue
    rerender(<MoneyText amountMinor={500} currency="USD" tone="negative" />);
    expect(screen.getByText('$')).not.toHaveClass('text-muted-foreground');
  });
});
