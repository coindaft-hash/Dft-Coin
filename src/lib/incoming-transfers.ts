export type IncomingTransfer = {
  id: string;
  senderEmail: string;
  recipientEmail: string;
  amount: number;
  note?: string;
  timestamp: number;
};

const STORAGE_EVENT_KEY = "vx-transfer-event";
const UNSEEN_STORAGE_KEY = "vx-unseen-transfers";
const SEEN_IDS_KEY = "vx-seen-transfer-ids";

function getSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_IDS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function markTransferSeen(id: string) {
  try {
    const seen = getSeenIds();
    seen.add(id);
    localStorage.setItem(SEEN_IDS_KEY, JSON.stringify(Array.from(seen)));
  } catch {
    // ignore
  }
}

export function broadcastIncomingTransfer(transfer: IncomingTransfer) {
  // 1. Dispatch custom event on current window
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("vx:incoming-transfer", { detail: transfer }));
  }

  // 2. Broadcast via BroadcastChannel
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel("vx-transfers-channel");
      bc.postMessage(transfer);
      bc.close();
    }
  } catch {
    // ignore
  }

  // 3. Write to localStorage event key for cross-tab storage listener
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify({ ...transfer, _rand: Math.random() }));
    }
  } catch {
    // ignore
  }

  // 4. Save into unseen queue for the recipient
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(UNSEEN_STORAGE_KEY);
      const list: IncomingTransfer[] = raw ? JSON.parse(raw) : [];
      list.unshift(transfer);
      localStorage.setItem(UNSEEN_STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
    }
  } catch {
    // ignore
  }
}

export function listenForIncomingTransfers(
  userEmail: string,
  onReceived: (transfer: IncomingTransfer) => void
): () => void {
  if (typeof window === "undefined" || !userEmail) return () => {};

  const normUserEmail = userEmail.trim().toLowerCase();

  const handleTransfer = (transfer: IncomingTransfer) => {
    if (!transfer || !transfer.id) return;
    const normRecipient = (transfer.recipientEmail || "").trim().toLowerCase();
    if (
      !normUserEmail ||
      normRecipient === normUserEmail ||
      normRecipient === "*" ||
      normRecipient === "all" ||
      normRecipient === "demo"
    ) {
      const seen = getSeenIds();
      if (!seen.has(transfer.id)) {
        onReceived(transfer);
      }
    }
  };

  // 1. Check existing unseen queue in localStorage on initial attach
  try {
    const raw = localStorage.getItem(UNSEEN_STORAGE_KEY);
    if (raw) {
      const list: IncomingTransfer[] = JSON.parse(raw);
      const seen = getSeenIds();
      const unseenForMe = list.filter(t => {
        const nr = (t.recipientEmail || "").trim().toLowerCase();
        return (
          (!normUserEmail || nr === normUserEmail || nr === "*" || nr === "all" || nr === "demo") &&
          !seen.has(t.id)
        );
      });
      if (unseenForMe.length > 0) {
        handleTransfer(unseenForMe[0]);
      }
    }
  } catch {
    // ignore
  }

  // 2. Custom event listener (same window)
  const onCustomEvent = (e: Event) => {
    const transfer = (e as CustomEvent<IncomingTransfer>).detail;
    if (transfer) handleTransfer(transfer);
  };
  window.addEventListener("vx:incoming-transfer", onCustomEvent);

  // 3. Storage event listener (cross-tab)
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_EVENT_KEY && e.newValue) {
      try {
        const transfer = JSON.parse(e.newValue);
        handleTransfer(transfer);
      } catch {
        // ignore
      }
    }
  };
  window.addEventListener("storage", onStorage);

  // 4. BroadcastChannel listener
  let bc: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel("vx-transfers-channel");
      bc.onmessage = (e) => {
        if (e.data) handleTransfer(e.data);
      };
    }
  } catch {
    // ignore
  }

  return () => {
    window.removeEventListener("vx:incoming-transfer", onCustomEvent);
    window.removeEventListener("storage", onStorage);
    if (bc) {
      try {
        bc.close();
      } catch {
        // ignore
      }
    }
  };
}
