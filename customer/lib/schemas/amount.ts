import { z } from 'zod';

// The amount field is a string (from an <input>). Validate a positive amount with
// at most 2 decimals; the form converts it to cents with parseAmountToMinor.
export const amountSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount')
    .refine((v) => Number(v) > 0, 'Amount must be greater than 0'),
  note: z.string().optional(),
});

export type AmountInput = z.infer<typeof amountSchema>;
