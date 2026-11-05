import { useState, useEffect } from "react";
import { Mail, Check, AlertCircle, Key, Send, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  getEmailConfig,
  saveEmailConfig,
  sendEmailViaThirdParty,
  type EmailProvider,
} from "@/lib/email-service";

export function EmailConfigModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [provider, setProvider] = useState<EmailProvider>("resend");
  const [apiKey, setApiKey] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      const cfg = getEmailConfig();
      if (cfg) {
        setProvider(cfg.provider);
        setApiKey(cfg.apiKey || "");
        setSenderEmail(cfg.senderEmail || "");
      }
      setSaved(false);
    }
  }, [open]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API Key");
      return;
    }
    saveEmailConfig({
      provider,
      apiKey: apiKey.trim(),
      senderEmail: senderEmail.trim() || (provider === "resend" ? "onboarding@resend.dev" : undefined),
    });
    setSaved(true);
    toast.success("Email service configuration saved!");
    setTimeout(() => onOpenChange(false), 600);
  };

  const handleTestSend = async () => {
    if (!apiKey.trim()) return toast.error("Please enter an API key first");
    if (!testEmail || !testEmail.includes("@")) return toast.error("Please enter a valid test email address");

    // Save temporary config
    saveEmailConfig({
      provider,
      apiKey: apiKey.trim(),
      senderEmail: senderEmail.trim() || (provider === "resend" ? "onboarding@resend.dev" : undefined),
    });

    setTesting(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const res = await sendEmailViaThirdParty({
      to: testEmail,
      code,
      purpose: "register",
    });
    setTesting(false);

    if (res.sent) {
      toast.success(`Test email sent successfully to ${testEmail}! Check your inbox.`);
    } else {
      toast.error(res.error || "Failed to send test email. Please check your API key.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0d1626] border border-[#1d2a38] text-[#eef2f6] shadow-2xl p-6 sm:rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="grid size-9 place-items-center rounded-lg bg-[#12342d] text-[#34cc9b]">
              <Mail className="size-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-white">
              Real Email Service Setup (Free)
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-[#8b95a1]">
            Connect Resend or Brevo for 100% real inbox delivery without credit cards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Provider selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#c8d0da]">Select Free Provider</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProvider("resend")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  provider === "resend"
                    ? "bg-[#12342d] border-[#09c48d] text-[#34cc9b]"
                    : "bg-[#111b27] border-[#1d2a38] text-[#8b95a1] hover:text-[#eef2f6]"
                }`}
              >
                Resend.com (Recommended)
                <span className="block text-[10px] font-normal opacity-70">3,000 free emails/mo</span>
              </button>

              <button
                type="button"
                onClick={() => setProvider("brevo")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  provider === "brevo"
                    ? "bg-[#12342d] border-[#09c48d] text-[#34cc9b]"
                    : "bg-[#111b27] border-[#1d2a38] text-[#8b95a1] hover:text-[#eef2f6]"
                }`}
              >
                Brevo.com (Sendinblue)
                <span className="block text-[10px] font-normal opacity-70">300 free emails/day</span>
              </button>
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#c8d0da]">
                {provider === "resend" ? "Resend API Key (starts with re_)" : "Brevo API Key (starts with xkeysib-)"}
              </label>
              <a
                href={provider === "resend" ? "https://resend.com/api-keys" : "https://app.brevo.com/settings/keys/api"}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#34cc9b] hover:underline"
              >
                Get free key ↗
              </a>
            </div>
            <div className="relative flex items-center h-11 rounded-xl bg-[#111b27] border border-[#1d2a38] px-3">
              <Key className="size-4 text-[#6b7a8c] mr-2 shrink-0" />
              <input
                type="password"
                placeholder={provider === "resend" ? "re_123456789..." : "xkeysib-..."}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-transparent text-sm text-[#eef2f6] placeholder-[#5a6677] outline-none"
              />
            </div>
          </div>

          {/* Optional Sender */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#c8d0da]">
              Sender Email {provider === "resend" ? "(Default: onboarding@resend.dev)" : "(Your verified email)"}
            </label>
            <Input
              placeholder={provider === "resend" ? "onboarding@resend.dev" : "yourname@gmail.com"}
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              className="h-11 bg-[#111b27] border-[#1d2a38] text-sm text-[#eef2f6]"
            />
          </div>

          {/* Test send */}
          <div className="p-3 rounded-xl bg-[#111b27] border border-[#1d2a38] space-y-2">
            <p className="text-xs font-semibold text-[#c8d0da]">Test Real Email Delivery</p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter recipient email (e.g. ravox.global@gmail.com)"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="h-9 bg-[#080e1a] border-[#1d2a38] text-xs text-[#eef2f6]"
              />
              <Button
                type="button"
                size="sm"
                disabled={testing}
                onClick={handleTestSend}
                className="h-9 shrink-0 bg-[#12342d] hover:bg-[#18463c] text-[#34cc9b] font-semibold text-xs border border-[#34cc9b]/30"
              >
                {testing ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                Send Test
              </Button>
            </div>
          </div>

          {/* Save Button */}
          <Button
            type="button"
            onClick={handleSave}
            className="w-full h-11 rounded-xl bg-[#09c48d] hover:bg-[#12d49b] text-[#04140e] font-bold text-sm tracking-tight"
          >
            {saved ? <Check className="size-4 mr-1.5" /> : null}
            {saved ? "Saved" : "Save Email Configuration"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
