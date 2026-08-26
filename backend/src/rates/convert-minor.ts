import { Prisma } from '@prisma/client';

// Convert an integer minor-unit amount by an FX rate to integer minor units, using banker's
// rounding (ROUND_HALF_EVEN). The single source of truth for conversion — used by transfers
// AND the quote endpoint, so a preview can never disagree with what a transfer actually does.
export function convertMinor(amountMinor: number, rate: Prisma.Decimal): number {
  return new Prisma.Decimal(amountMinor)
    .times(rate)
    .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_EVEN)
    .toNumber();
}
