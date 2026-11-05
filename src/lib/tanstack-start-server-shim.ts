/**
 * Shim for `@tanstack/react-start/server` providing `useSession` and `getRequest`.
 */

export function getRequest() {
  if (typeof Request !== "undefined" && typeof window !== "undefined") {
    return new Request(window.location.href);
  }
  return undefined;
}

export async function useSession<T = Record<string, any>>(_config?: any) {
  let sessionData: any = {};
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem("vx-admin-gate-session") : null;
    if (raw) sessionData = JSON.parse(raw);
  } catch {
    sessionData = {};
  }

  return {
    data: sessionData as T,
    async update(newData: Partial<T>) {
      sessionData = { ...sessionData, ...newData };
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("vx-admin-gate-session", JSON.stringify(sessionData));
        }
      } catch {}
    },
    async clear() {
      sessionData = {};
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem("vx-admin-gate-session");
        }
      } catch {}
    },
  };
}
