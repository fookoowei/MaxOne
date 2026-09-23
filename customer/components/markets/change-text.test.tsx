import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChangeText } from './change-text';

describe('ChangeText', () => {
  it('signs, fixes to two decimals and colours by direction', () => {
    render(
      <>
        <ChangeText pct={3.842} />
        <ChangeText pct={-1.1} className="block text-xs" />
      </>,
    );
    expect(screen.getByText('+3.84%')).toHaveClass('text-status-approved');
    expect(screen.getByText('-1.10%')).toHaveClass('text-status-rejected', 'block', 'text-xs');
  });
});
