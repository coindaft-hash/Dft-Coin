export const RECORD_TABS = [
  { id: "deposits", label: "Deposits" },
  { id: "withdrawals", label: "Withdrawals" },
  { id: "transfers", label: "Transfers" },
  { id: "rewards", label: "Rewards" },
  { id: "funds", label: "Fund records" },
] as const;

export type RecordTab = (typeof RECORD_TABS)[number]["id"];

export const isRecordTab = (value: unknown): value is RecordTab =>
  RECORD_TABS.some(tab => tab.id === value);
