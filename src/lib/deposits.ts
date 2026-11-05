import { z } from "zod";

export const DEPOSIT_ADDRESS = "0x866297a402364cd8819ebd5111e2cafe75558318";
export const DEPOSIT_NETWORKS = {
  bsc: { label: "BSC", standard: "BEP20", chainId: "0x38", contract: "0x55d398326f99059ff775485246999027b3197955", decimals: 18, rpc: "https://bsc-rpc.publicnode.com", explorer: "https://bscscan.com/tx/" },
  ethereum: { label: "Ethereum", standard: "ERC20", chainId: "0x1", contract: "0xdac17f958d2ee523a2206206994597c13d831ec7", decimals: 6, rpc: "https://ethereum-rpc.publicnode.com", explorer: "https://etherscan.io/tx/" },
} as const;
export type DepositNetwork = keyof typeof DEPOSIT_NETWORKS;
export const TX_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;
export const depositInput = z.object({
  network: z.enum(["bsc", "ethereum"]),
  // Full 0x hashes verify on-chain automatically; any other reference (6–100 letters/digits) goes to manual admin review.
  txHash: z.string().trim().regex(/^(0x[0-9a-fA-F]{64}|[A-Za-z0-9-]{6,100})$/, "Enter a transaction hash or reference number (at least 6 letters or digits).").transform(v => v.toLowerCase()),
  amount: z.number().finite().positive().max(100_000),
});
export type DepositStatus = "pending" | "confirming" | "review" | "rejected" | "unavailable";
export type DepositCheck = { status: DepositStatus; confirmations: number; detected_amount: number | null; message: string };
export type DepositRecord = DepositCheck & { id: string; network: DepositNetwork; tx_hash: string; expected_amount: number; created_at: string };
export const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export const receiptSchema = z.object({
  transactionHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  blockNumber: z.string().regex(/^0x[0-9a-fA-F]+$/),
  blockHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  status: z.enum(["0x1", "0x0"]),
  logs: z.array(z.object({ address: z.string(), topics: z.array(z.string()), data: z.string(), removed: z.boolean().optional() })),
});

/** Exact integer accounting: never infer token payment from a native transfer or caller amount. */
export function receivedUsdt(receipt: z.infer<typeof receiptSchema>, network: DepositNetwork): bigint {
  const recipient = DEPOSIT_ADDRESS.slice(2).toLowerCase().padStart(64, "0");
  return receipt.logs.reduce((sum, log) => {
    if (log.removed || log.address.toLowerCase() !== DEPOSIT_NETWORKS[network].contract || log.topics.length !== 3 || log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC || log.topics[2]?.toLowerCase() !== `0x${recipient}` || !/^0x[0-9a-fA-F]{64}$/.test(log.data)) return sum;
    return sum + BigInt(log.data);
  }, 0n);
}

export function tokenAmount(units: bigint, decimals: number): string {
  const text = units.toString().padStart(decimals + 1, "0");
  return `${text.slice(0, -decimals)}.${text.slice(-decimals)}`;
}