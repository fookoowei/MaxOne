import { z } from 'zod';

export const alertSchema = z.object({
  symbol: z.string().min(1),
  direction: z.enum(['above', 'below']),
  targetPrice: z
    .string()
    .regex(/^\d*\.?\d+$/, 'Enter a valid price')
    .refine((v) => Number(v) > 0, 'Enter a valid price'),
});

export type AlertInput = z.infer<typeof alertSchema>;
