import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReceiveQr } from './receive-qr';

describe('ReceiveQr', () => {
  it('shows the @handle and renders a QR', () => {
    const { container } = render(<ReceiveQr handle="alice" />);
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeTruthy(); // qrcode.react renders an <svg>
  });
});
