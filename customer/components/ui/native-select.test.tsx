import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { NativeSelect } from './native-select';

describe('NativeSelect', () => {
  it('is a labelled native select that selectOptions can drive', async () => {
    render(
      <>
        <label htmlFor="c">Currency</label>
        <NativeSelect id="c" defaultValue="USD">
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </NativeSelect>
      </>,
    );
    const el = screen.getByLabelText('Currency') as HTMLSelectElement;
    await userEvent.selectOptions(el, 'EUR');
    expect(el.value).toBe('EUR');
  });

  it('draws one decorative chevron (the OS arrow is hidden)', () => {
    const { container } = render(
      <NativeSelect aria-label="x">
        <option>a</option>
      </NativeSelect>,
    );
    expect(container.querySelector('select')).toHaveClass('appearance-none');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
