import { z } from 'zod';

const positiveNumber = (msg: string) =>
  z
    .string()
    .regex(/^\d*\.?\d+$/, msg)
    .refine((v) => Number(v) > 0, msg);

export const holdingSchema = z.object({
  symbol: z.string().min(1),
  quantity: positiveNumber('Enter a valid quantity'),
  avgCost: positiveNumber('Enter a valid price'),
});

export type HoldingInput = z.infer<typeof holdingSchema>;
