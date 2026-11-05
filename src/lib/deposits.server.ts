import { DEPOSIT_NETWORKS, TX_HASH_PATTERN, depositInput, receiptSchema, receivedUsdt, tokenAmount, type DepositCheck } from "./deposits";
import { z } from "zod";

export async function inspectDeposit(data: z.infer<typeof depositInput>): Promise<DepositCheck> {
  const config = DEPOSIT_NETWORKS[data.network];
  // Reference numbers (not full 0x hashes) cannot be checked on-chain: straight to manual admin review.
  if (!TX_HASH_PATTERN.test(data.txHash)) {
    return { status: "review", confirmations: 0, detected_amount: null, message: "Reference number received. Manual review is required before any balance credit." };
  }
  async function rpc(method: string, params: unknown[]) {
    const response = await fetch(config.rpc, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("RPC unavailable");
    const payload = z.object({ result: z.unknown().optional(), error: z.unknown().optional() }).parse(await response.json());
    if (payload.error || !("result" in payload)) throw new Error("RPC rejected request");
    return payload.result;
  }
  try {
    const chain = await rpc("eth_chainId", []);
    if (chain !== config.chainId) throw new Error("Wrong RPC network");
    const result = await rpc("eth_getTransactionReceipt", [data.txHash]);
    if (result === null) return { status: "pending", confirmations: 0, detected_amount: null, message: "Transaction not found on this network yet. Check the TXID and selected network." };
    const receipt = receiptSchema.parse(result);
    if (receipt.transactionHash.toLowerCase() !== data.txHash) throw new Error("Receipt mismatch");
    if (receipt.status === "0x0") return { status: "rejected", confirmations: 0, detected_amount: null, message: "The blockchain transaction failed. No payment credited." };
    const units = receivedUsdt(receipt, data.network);
    if (units <= 0n) return { status: "rejected", confirmations: 0, detected_amount: null, message: "No supported USDT transfer to the deposit address was found." };
    const detected = Number(tokenAmount(units, config.decimals));
    const [headResult, finalResult, minedResult] = await Promise.all([
      rpc("eth_blockNumber", []), rpc("eth_getBlockByNumber", ["finalized", false]), rpc("eth_getBlockByNumber", [receipt.blockNumber, false]),
    ]);
    const head = z.string().regex(/^0x[0-9a-fA-F]+$/).parse(headResult);
    const block = z.object({ number: z.string().regex(/^0x[0-9a-fA-F]+$/), hash: z.string() });
    const final = block.parse(finalResult);
    const mined = block.parse(minedResult);
    if (mined.hash.toLowerCase() !== receipt.blockHash.toLowerCase()) throw new Error("Chain changed");
    const confirmations = Math.max(0, Number(BigInt(head) - BigInt(receipt.blockNumber) + 1n));
    if (BigInt(final.number) < BigInt(receipt.blockNumber)) return { status: "confirming", confirmations, detected_amount: detected, message: "USDT detected. Waiting for blockchain finality; no balance credited." };
    return { status: "review", confirmations, detected_amount: detected, message: "On-chain USDT payment verified. Ownership review is required before any real balance credit." };
  } catch {
    return { status: "unavailable", confirmations: 0, detected_amount: null, message: "Blockchain verification is temporarily unavailable. No balance credited. Try again later." };
  }
}