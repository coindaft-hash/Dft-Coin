import { describe, expect, it } from "vitest";
import { DEPOSIT_ADDRESS, DEPOSIT_NETWORKS, TRANSFER_TOPIC, depositInput, receivedUsdt, tokenAmount } from "@/lib/deposits";

describe("USDT deposit validation", () => {
  const log = { address: DEPOSIT_NETWORKS.bsc.contract, topics: [TRANSFER_TOPIC, `0x${"1".repeat(64)}`, `0x${DEPOSIT_ADDRESS.slice(2).padStart(64, "0")}`], data: `0x${(10n ** 18n).toString(16).padStart(64, "0")}` };
  const receipt = { transactionHash: `0x${"a".repeat(64)}`, blockHash: `0x${"b".repeat(64)}`, blockNumber: "0x1", status: "0x1" as const, logs: [log] };
  it("counts only supported token transfers to the configured recipient", () => {
    expect(receivedUsdt(receipt, "bsc")).toBe(10n ** 18n);
    expect(receivedUsdt(receipt, "ethereum")).toBe(0n);
    expect(receivedUsdt({ ...receipt, logs: [{ ...log, removed: true }] }, "bsc")).toBe(0n);
    expect(receivedUsdt({ ...receipt, logs: [{ ...log, topics: log.topics.slice(0, 2) }] }, "bsc")).toBe(0n);
  });
  it("retains exact token decimals", () => {
    expect(tokenAmount(1234567n, 6)).toBe("1.234567");
    expect(tokenAmount(1n, 18)).toBe("0.000000000000000001");
  });
  it("rejects invalid hashes, networks and amounts; ignores caller ownership", () => {
    const data = { network: "bsc", txHash: receipt.transactionHash, amount: 4 };
    expect(depositInput.safeParse(data).success).toBe(true);
    for (const invalid of [{ amount: 0 }, { amount: 100001 }, { network: "tron" }, { txHash: "0x123" }]) expect(depositInput.safeParse({ ...data, ...invalid }).success).toBe(false);
    expect(depositInput.parse({ ...data, user_id: "attacker" })).not.toHaveProperty("user_id");
  });
});