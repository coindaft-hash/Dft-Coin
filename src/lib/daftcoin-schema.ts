import { z } from "zod";

export const daftUpdateSchema = z.object({
  action: z.enum(["pump", "dump", "set"]),
  price: z.number().finite().positive().max(1_000_000).optional(),
  trend: z.enum(["up", "down", "neutral"]).default("neutral"),
}).refine(v => v.action !== "set" || v.price !== undefined, "Enter a price");