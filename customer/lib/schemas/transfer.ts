import { z } from 'zod';

export const transferSchema = z.object({
  handle: z.string().regex(/^[a-z][a-z0-9_]{2,19}$/, 'Enter a valid @handle'),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount')
    .refine((v) => Number(v) > 0, 'Amount must be greater than 0'),
  note: z.string().optional(),
});

export type TransferInput = z.infer<typeof transferSchema>;
