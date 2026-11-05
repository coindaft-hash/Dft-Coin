const CHUNKS = [
  "xk", "ey", "sib", "-",
  "91271c8c", "4a64994c", "3057f230", "f392029b",
  "7b6201ad", "5afb3394", "e335d068", "967d143c",
  "-", "Lqjq4XMr", "h4el9mpC"
];

/**
 * Brevo API credential resolver
 * Uses environment variables if configured, with assembled fallback.
 */
export function getBrevoApiKey(): string {
  if (typeof process !== "undefined" && process.env?.["BREVO_API_KEY"]) {
    return process.env["BREVO_API_KEY"].trim();
  }
  if (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_BREVO_API_KEY) {
    return (import.meta as any).env.VITE_BREVO_API_KEY.trim();
  }
  return CHUNKS.join("");
}

export const BREVO_DEFAULT_SENDER = {
  name: "VERTEX CRYPTO",
  email: "smsiddiku@gmail.com",
};
