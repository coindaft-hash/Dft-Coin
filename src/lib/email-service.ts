import { getBrevoApiKey, BREVO_DEFAULT_SENDER } from "./brevo-credentials";

export type EmailProvider = "resend" | "brevo" | "smtp";

export type EmailConfig = {
  provider: EmailProvider;
  apiKey: string;
  senderEmail?: string;
  senderName?: string;
};

const STORAGE_KEY = "vx-email-service-config";

export const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  provider: "brevo",
  apiKey: getBrevoApiKey(),
  senderName: BREVO_DEFAULT_SENDER.name,
  senderEmail: BREVO_DEFAULT_SENDER.email,
};

export function getEmailConfig(): EmailConfig {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.apiKey && parsed.apiKey.trim().length > 5) return parsed;
      }
    }

    const envResend = typeof process !== "undefined" ? process.env?.["RESEND_API_KEY"] : undefined;
    if (envResend) {
      return {
        provider: "resend",
        apiKey: envResend,
        senderEmail: "onboarding@resend.dev",
      };
    }
  } catch {}

  return {
    provider: "brevo",
    apiKey: getBrevoApiKey(),
    senderName: BREVO_DEFAULT_SENDER.name,
    senderEmail: BREVO_DEFAULT_SENDER.email,
  };
}

export function saveEmailConfig(config: EmailConfig) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
  } catch {}
}

export function generateEmailHtml(code: string, purpose: "register" | "withdraw"): string {
  const title = purpose === "register" ? "Account Registration" : "Withdrawal Authorization";
  const desc =
    purpose === "register"
      ? "Use the 6-digit verification code below to complete your Vertex account registration."
      : "A withdrawal request has been initiated on your Vertex account. Use the code below to authorize.";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Vertex Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080e1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #eef2f6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #080e1a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="460" border="0" cellspacing="0" cellpadding="0" style="max-width: 460px; background-color: #111b27; border-radius: 16px; border: 1px solid #1d2a38; overflow: hidden; padding: 32px 28px;">
          <!-- Logo / Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="font-size: 24px; font-weight: 800; letter-spacing: 2px; color: #ffffff;">
                VERTEX<span style="color: #34cc9b;">.</span>
              </div>
              <div style="font-size: 12px; color: #8b95a1; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">
                ${title}
              </div>
            </td>
          </tr>
          <!-- Body Text -->
          <tr>
            <td style="font-size: 14px; line-height: 1.6; color: #c8d0da; text-align: center; padding-bottom: 24px;">
              ${desc}
            </td>
          </tr>
          <!-- Code Box -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="background-color: #080e1a; border: 1.5px solid #09c48d; border-radius: 12px; padding: 18px 24px; display: inline-block;">
                <span style="font-family: monospace; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #34cc9b; display: block; margin-left: 8px;">
                  ${code}
                </span>
              </div>
            </td>
          </tr>
          <!-- Expiration -->
          <tr>
            <td style="font-size: 12.5px; line-height: 1.5; color: #8b95a1; text-align: center; border-top: 1px solid #1d2a38; padding-top: 20px;">
              This code is valid for <strong>10 minutes</strong>. Never share this code with anyone.<br/>
              If you did not make this request, please secure your account immediately.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Dispatches a real email via server API route or direct Brevo/Resend API
 */
export async function sendEmailViaThirdParty(params: {
  to: string;
  code: string;
  purpose: "register" | "withdraw";
}): Promise<{ sent: boolean; provider?: string; error?: string }> {
  const config = getEmailConfig();
  const subject = `Vertex Verification Code: ${params.code}`;
  const html = generateEmailHtml(params.code, params.purpose);

  // 1. Try server proxy endpoint first (avoids browser CORS)
  try {
    const srvRes = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: params.to.trim(),
        code: params.code,
        purpose: params.purpose,
      }),
    });
    if (srvRes.ok) {
      return { sent: true, provider: config.provider };
    }
  } catch {}

  // 2. Direct API call fallback
  try {
    if (config.provider === "brevo") {
      const sender = {
        name: config.senderName || "VERTEX CRYPTO",
        email: config.senderEmail || "smsiddiku@gmail.com",
      };

      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": config.apiKey.trim(),
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender,
          to: [{ email: params.to.trim() }],
          subject,
          htmlContent: html,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return {
          sent: false,
          provider: "brevo",
          error: errJson.message || `Brevo error HTTP ${res.status}`,
        };
      }

      return { sent: true, provider: "brevo" };
    }

    if (config.provider === "resend") {
      const fromAddress = config.senderEmail || "Vertex Security <onboarding@resend.dev>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [params.to.trim()],
          subject,
          html,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return {
          sent: false,
          provider: "resend",
          error: errJson.message || `Resend error HTTP ${res.status}`,
        };
      }

      return { sent: true, provider: "resend" };
    }

    return { sent: false, error: "Unsupported provider" };
  } catch (err: any) {
    return { sent: false, error: err?.message || "Network error sending email" };
  }
}
