import { z } from 'zod';
import { CURRENCY_CODES } from '@/lib/currencies';

export const walletSchema = z.object({
  currency: z.string().refine((c) => CURRENCY_CODES.includes(c), 'Unsupported currency'),
});

export type WalletInput = z.infer<typeof walletSchema>;
