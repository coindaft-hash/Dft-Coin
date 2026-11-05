import { describe, expect, it } from "vitest";
import { daftUpdateSchema } from "@/lib/daftcoin-schema";

describe("DaftCoin simulated price input", () => {
  it("allows pump and dump without a manually entered price", () => {
    expect(daftUpdateSchema.parse({ action: "pump" }).trend).toBe("neutral");
    expect(daftUpdateSchema.safeParse({ action: "dump" }).success).toBe(true);
  });
  it("accepts positive manual prices and a valid trend", () => {
    expect(daftUpdateSchema.safeParse({ action: "set", price: 1.25, trend: "up" }).success).toBe(true);
  });
  it("rejects missing, invalid, or excessive prices and invalid trends", () => {
    for (const price of [undefined, 0, -1, Infinity, NaN, 1_000_001]) {
      expect(daftUpdateSchema.safeParse({ action: "set", price }).success).toBe(false);
    }
    expect(daftUpdateSchema.safeParse({ action: "set", price: 1, trend: "fake" }).success).toBe(false);
  });
});