import { Prisma } from '@prisma/client';
import { convertMinor } from './convert-minor';

describe('convertMinor', () => {
  it('converts with banker (half-even) rounding', () => {
    // 50000 * 0.87781 = 43890.5 → half-even → 43890 (the real M4c live-run tie)
    expect(convertMinor(50000, new Prisma.Decimal('0.87781'))).toBe(43890);
  });

  it('returns the same amount for a rate of 1', () => {
    expect(convertMinor(12345, new Prisma.Decimal(1))).toBe(12345);
  });

  it('rounds half-even upward when the integer part is odd', () => {
    // 3 * 0.5 = 1.5 → nearest even → 2
    expect(convertMinor(3, new Prisma.Decimal('0.5'))).toBe(2);
  });
});
