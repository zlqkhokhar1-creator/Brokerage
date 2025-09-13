import { z } from "zod";

export const OrderCreate = z.object({
  symbol: z.string(),
  side: z.enum(["BUY", "SELL"]),
  type: z.enum(["MARKET", "LIMIT"]),
  qty: z.number().positive(),
  limitPrice: z.number().optional()
});

export type OrderCreate = z.infer<typeof OrderCreate>;
