import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it } from 'vitest';
import { CoinIcon } from './coin-icon';

const SRC = 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png';

describe('CoinIcon', () => {
  it('renders the provider logo when there is one', () => {
    const { container } = render(<CoinIcon src={SRC} symbol="BTC" />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', SRC);
    expect(img).toHaveAttribute('alt', ''); // decorative — the name sits beside it in text
  });

  it('falls back to the lettered badge when the provider sent no image', () => {
    const { container } = render(<CoinIcon symbol="DOGE" />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('DOGE')).toBeInTheDocument();
  });

  it('falls back to the badge if the image fails to load', () => {
    const { container } = render(<CoinIcon src={SRC} symbol="ETH" />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('ETH')).toBeInTheDocument();
  });
});
