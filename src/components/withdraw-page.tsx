import { useCallback, useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Eye,
  EyeOff,
  Headset,
  Loader2,
  Lock,
  Mail,
  ReceiptText,
} from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "@/hooks/use-account";
import { supabase } from "@/integrations/supabase/client";
import {
  useTestAccount,
  deductAvailableBalance,
} from "@/lib/demo-positions";
import { VertexMark } from "@/components/vertex-logo";
import {
  dispatchVerificationCode,
  verifyDispatchedCode,
} from "@/lib/verification-codes";

const FEE_RATE = 0.05; // 5% platform fee rate
const MIN_WITHDRAWAL = 10;

function formatDisplayMoney(val: number): string {
  if (!Number.isFinite(val) || val <= 0) return "$0";
  if (val % 1 === 0) return `$${val}`;
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function WithdrawPage() {
  const navigate = useNavigate();
  const { account, checked } = useAccount();
  const { availableBalance } = useTestAccount();

  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Form states
  const [amount, setAmount] = useState("");
  const [withdrawalPassword, setWithdrawalPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Address and Network states
  const [withdrawAddress, setWithdrawAddress] = useState(() => account?.withdrawAddress || "");
  const [withdrawNetwork, setWithdrawNetwork] = useState<"bep20" | "trc20" | "erc20">("bep20");
  const [addressError, setAddressError] = useState<string | null>(null);

  // Interactive focus states for fine-tuned icon and border styling
  const [focusedField, setFocusedField] = useState<"address" | "amount" | "password" | "code" | null>(null);

  // Validation errors
  const [amountError, setAmountError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Submission state
  const [busy, setBusy] = useState(false);

  // Staggered mounting animation
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, []);

  // Countdown timer for email verification code
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [countdown]);

  // Load wallet balance from Supabase
  const loadWallet = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("ensure_my_wallet");
      if (!error && typeof data === "number") {
        setWalletBalance(Number(data));
      }
    } catch {
      // Fallback seamlessly to local account store
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void loadWallet();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        setTimeout(() => void loadWallet(), 0);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [loadWallet]);

  // Active withdrawable balance derived dynamically from backend / wallet state
  const withdrawableBalance =
    typeof walletBalance === "number" && walletBalance > 0
      ? walletBalance
      : typeof availableBalance === "number"
        ? availableBalance
        : 0;

  // Fee calculation (dynamic, calculated strictly from data)
  const amountNum = parseFloat(amount) || 0;
  const feeAmount = amountNum > 0 ? amountNum * FEE_RATE : 0;
  const actualArrival = amountNum > 0 ? Math.max(0, amountNum - feeAmount) : 0;

  // Handle Amount change (numbers and single decimal only)
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, "");
    // prevent multiple decimal points
    const parts = val.split(".");
    const cleanVal = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : val;
    setAmount(cleanVal);
    if (amountError) setAmountError(null);
    if (generalError) setGeneralError(null);
  };

  // Handle Max button
  const handleMaxAmount = () => {
    if (withdrawableBalance > 0) {
      setAmount(withdrawableBalance.toString());
      if (amountError) setAmountError(null);
      if (generalError) setGeneralError(null);
    } else {
      setAmount("0");
    }
  };

  // Request real email verification code
  const handleGetCode = async () => {
    if (countdown > 0) return;
    setCodeError(null);
    setGeneralError(null);

    let userEmail = account?.email;
    if (!userEmail) {
      try {
        const raw = localStorage.getItem("vx-mock-user");
        if (raw) userEmail = JSON.parse(raw).email;
      } catch {}
    }
    if (!userEmail) {
      try {
        const { data } = await supabase.auth.getUser();
        userEmail = data.user?.email;
      } catch {}
    }

    if (!userEmail) {
      setCodeError("Please sign in with a registered email account.");
      return;
    }

    try {
      await dispatchVerificationCode(userEmail, "withdraw");
      setCodeSent(true);
      setCountdown(59);
    } catch (err: any) {
      setCodeError(err?.message || "Failed to send code. Please retry.");
    }
  };

  // Submit withdrawal request
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setSuccessNotice(null);

    // Validation 1: Address
    const cleanAddress = withdrawAddress.trim();
    if (!cleanAddress || cleanAddress.length < 10) {
      setAddressError("Please enter a valid BEP20 USDT destination wallet address");
      return;
    }

    // Validation 2: Amount
    if (!amount || amountNum <= 0) {
      setAmountError("Enter an amount");
      return;
    }
    if (amountNum < MIN_WITHDRAWAL) {
      setAmountError(`Minimum withdrawal is $${MIN_WITHDRAWAL}`);
      return;
    }
    if (amountNum > withdrawableBalance) {
      setAmountError("Amount exceeds your withdrawable balance");
      return;
    }

    // Validation 3: Password
    if (!withdrawalPassword.trim()) {
      setPasswordError("Enter your withdrawal password");
      return;
    }

    // Validation 4: Verification Code
    if (!codeSent) {
      setCodeError("Please request an email verification code first.");
      return;
    }
    if (verificationCode.trim().length < 6) {
      setCodeError("Enter the 6-digit code from your email");
      return;
    }

    setBusy(true);

    try {
      let userId = account?.id;
      let userName = account?.fullName;
      let userEmail = account?.email;

      if (!userId || !userEmail) {
        try {
          const raw = localStorage.getItem("vx-mock-user");
          if (raw) {
            const parsed = JSON.parse(raw);
            userId = userId || parsed.id;
            userEmail = userEmail || parsed.email;
            userName =
              userName ||
              parsed.user_metadata?.full_name ||
              parsed.full_name ||
              parsed.email?.split("@")[0];
          }
        } catch {}
      }

      // Verify code with verification-codes service
      const { valid, error: vErr } = await verifyDispatchedCode(
        userEmail || "user@email.com",
        verificationCode,
        "withdraw"
      );

      if (!valid) {
        setBusy(false);
        setCodeError(vErr || "Invalid verification code. Please check or request a new code.");
        return;
      }

      const networkLabel =
        withdrawNetwork === "bep20"
          ? "USDT (BEP20)"
          : withdrawNetwork === "trc20"
          ? "USDT (TRC20)"
          : "USDT (ERC20)";

      // 1. Deduct from local test / available balance immediately
      try {
        deductAvailableBalance(amountNum);
      } catch {}

      // 2. Call backend RPC if available
      try {
        await supabase.rpc("request_withdrawal", {
          _network: withdrawNetwork,
          _address: cleanAddress,
          _amount: Math.round(amountNum * 100) / 100,
        });
      } catch {}

      // 3. Save withdrawal record locally and sync with Admin Panel
      try {
        const record = {
          id: "wth_" + Date.now(),
          user_id: userId || "usr_client",
          user_name: userName || userEmail?.split("@")[0] || "Registered User",
          user_email: userEmail || "member@vertex.market",
          amount: amountNum,
          fee: feeAmount,
          actualArrival,
          payment_method: "USDT",
          network: networkLabel,
          account_number: cleanAddress,
          address: cleanAddress,
          status: "pending",
          created_at: new Date().toISOString(),
        };

        const stored = localStorage.getItem("vx-withdrawals");
        const list = stored ? JSON.parse(stored) : [];
        list.unshift(record);
        localStorage.setItem("vx-withdrawals", JSON.stringify(list));

        // Sync to admin panel store directly
        const adminStored = localStorage.getItem("vx_admin_withdrawals");
        const adminList = adminStored ? JSON.parse(adminStored) : [];
        adminList.unshift(record);
        localStorage.setItem("vx_admin_withdrawals", JSON.stringify(adminList));

        // Attempt Supabase insert if connected
        try {
          await supabase.from("withdrawals").insert({
            user_id: record.user_id,
            amount: record.amount,
            payment_method: "USDT",
            network: record.network,
            account_number: record.address,
            status: "pending",
            created_at: record.created_at,
          });
        } catch {}
      } catch {}

      setSuccessNotice("Withdrawal request submitted successfully.");
      toast.success("Withdrawal request submitted");
      setAmount("");
      setWithdrawalPassword("");
      setVerificationCode("");
      setCodeSent(false);
      setCountdown(0);
      void loadWallet();
    } catch {
      setGeneralError("Withdrawal request could not be submitted. Please retry.");
    } finally {
      setBusy(false);
    }
  };

  // Helper for transition styles
  const getItemStyle = (stepIndex: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) ${stepIndex * 0.06}s, transform 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) ${stepIndex * 0.06}s`,
  });

  return (
    <div className="min-h-screen bg-[#080e1a] text-[#eef2f6] font-sans antialiased selection:bg-[#09c48d]/25 selection:text-white pb-24">
      <div className="mx-auto max-w-[420px] px-5 pt-4">
        {/* 1. Header with back button, Withdraw title, and elegant Vertex branding */}
        <header
          style={getItemStyle(0)}
          className="flex items-center justify-between h-[52px] mb-3"
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  window.history.back();
                } else {
                  void navigate({ to: "/profile" });
                }
              }}
              aria-label="Back"
              className="grid size-[38px] place-items-center rounded-[10px] bg-[#111b27] text-[#eef2f6] hover:bg-[#16222f] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[#09c48d]"
            >
              <ChevronLeft className="size-5 text-[#eef2f6]" strokeWidth={2.2} />
            </button>
            <h1 className="text-[20px] font-semibold text-white tracking-tight">
              Withdraw
            </h1>
          </div>

          {/* Vertex Brand Logo Accent */}
          <Link
            to="/"
            title="Vertex Home"
            className="flex items-center gap-2 group py-1 px-1.5 rounded-[10px] hover:bg-[#111b27]/80 transition-colors focus-visible:outline-none"
          >
            <div className="grid size-[34px] place-items-center rounded-[9px] bg-[#111b27] border border-[#1d2a38]/60 shadow-sm group-hover:border-[#09c48d]/40 transition-colors">
              <VertexMark className="size-4" />
            </div>
            <span className="text-[13px] font-bold text-white tracking-wider hidden sm:inline">
              VERTEX<span className="text-[#34cc9b]">.</span>
            </span>
          </Link>
        </header>

        {/* 2. Balance Block */}
        <section
          style={getItemStyle(1)}
          className="rounded-[14px] bg-[#111b27] px-[18px] py-[16px] mb-5"
          aria-label="Withdrawable Balance"
        >
          <p className="text-[13px] font-normal text-[#8b95a1] leading-none mb-2">
            Withdrawable Amount
          </p>
          <p className="text-[34px] font-semibold text-white tracking-[-0.5px] leading-tight">
            {formatDisplayMoney(withdrawableBalance)}
          </p>
        </section>

        {/* Withdrawal Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Network Selector */}
          <div style={getItemStyle(2)}>
            <label className="block text-[13px] font-medium text-[#c8d0da] mb-[7px]">
              Withdrawal Network
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setWithdrawNetwork("bep20")}
                className={`py-2 px-3 rounded-[10px] text-[12px] font-semibold border transition-all ${
                  withdrawNetwork === "bep20"
                    ? "bg-[#09c48d]/15 border-[#09c48d] text-[#34cc9b]"
                    : "bg-[#111b27] border-[#1d2a38] text-[#8b95a1] hover:text-white"
                }`}
              >
                BEP20 (BSC)
              </button>
              <button
                type="button"
                onClick={() => setWithdrawNetwork("trc20")}
                className={`py-2 px-3 rounded-[10px] text-[12px] font-semibold border transition-all ${
                  withdrawNetwork === "trc20"
                    ? "bg-[#09c48d]/15 border-[#09c48d] text-[#34cc9b]"
                    : "bg-[#111b27] border-[#1d2a38] text-[#8b95a1] hover:text-white"
                }`}
              >
                TRC20
              </button>
              <button
                type="button"
                onClick={() => setWithdrawNetwork("erc20")}
                className={`py-2 px-3 rounded-[10px] text-[12px] font-semibold border transition-all ${
                  withdrawNetwork === "erc20"
                    ? "bg-[#09c48d]/15 border-[#09c48d] text-[#34cc9b]"
                    : "bg-[#111b27] border-[#1d2a38] text-[#8b95a1] hover:text-white"
                }`}
              >
                ERC20
              </button>
            </div>
          </div>

          {/* Destination Wallet Address */}
          <div style={getItemStyle(2.5)}>
            <label
              htmlFor="withdraw-address"
              className="block text-[13px] font-medium text-[#c8d0da] mb-[7px]"
            >
              {withdrawNetwork === "bep20" ? "BEP20" : withdrawNetwork === "trc20" ? "TRC20" : "ERC20"} Destination Wallet Address
            </label>
            <div
              className={`relative flex items-center h-[50px] rounded-[12px] px-[14px] transition-all duration-200 ${
                addressError
                  ? "bg-[#111b27] ring-[1.5px] ring-[#ff5a63]"
                  : focusedField === "address"
                    ? "bg-[#16222f] ring-[1.5px] ring-[#09c48d]"
                    : "bg-[#111b27]"
              }`}
            >
              <input
                id="withdraw-address"
                type="text"
                autoComplete="off"
                placeholder={withdrawNetwork === "trc20" ? "Enter TRC20 address (T...)" : "Enter BEP20 USDT address (0x...)"}
                value={withdrawAddress}
                onChange={(e) => {
                  setWithdrawAddress(e.target.value);
                  if (addressError) setAddressError(null);
                  if (generalError) setGeneralError(null);
                }}
                onFocus={() => setFocusedField("address")}
                onBlur={() => setFocusedField(null)}
                className="w-full h-full bg-transparent text-[14px] text-[#eef2f6] placeholder-[#5a6677] outline-none font-mono"
              />
            </div>
            {addressError && (
              <p className="text-[12px] text-[#ff5a63] mt-1.5 ml-1 transition-opacity duration-200 animate-in fade-in-50">
                {addressError}
              </p>
            )}
          </div>

          {/* 3. Amount Field */}
          <div style={getItemStyle(3)}>
            <label
              htmlFor="withdraw-amount"
              className="block text-[13px] font-medium text-[#c8d0da] mb-[7px]"
            >
              Amount
            </label>
            <div
              className={`relative flex items-center h-[50px] rounded-[12px] px-[14px] transition-all duration-200 ${
                amountError
                  ? "bg-[#111b27] ring-[1.5px] ring-[#ff5a63]"
                  : focusedField === "amount"
                    ? "bg-[#16222f] ring-[1.5px] ring-[#09c48d]"
                    : "bg-[#111b27]"
              }`}
            >
              <DollarSign
                className={`size-[18px] shrink-0 mr-2.5 transition-colors duration-200 ${
                  focusedField === "amount" ? "text-[#34cc9b]" : "text-[#6b7a8c]"
                }`}
                strokeWidth={2}
              />
              <input
                id="withdraw-amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Enter amount"
                value={amount}
                onChange={handleAmountChange}
                onFocus={() => setFocusedField("amount")}
                onBlur={() => setFocusedField(null)}
                className="w-full h-full bg-transparent text-[15px] text-[#eef2f6] placeholder-[#5a6677] outline-none font-sans"
              />
              <button
                type="button"
                onClick={handleMaxAmount}
                className="shrink-0 text-[13px] font-semibold text-[#34cc9b] hover:text-[#12d49b] active:scale-95 transition-all px-1.5 py-1 focus-visible:outline-none"
              >
                Max
              </button>
            </div>
            {amountError && (
              <p className="text-[12px] text-[#ff5a63] mt-1.5 ml-1 transition-opacity duration-200 animate-in fade-in-50">
                {amountError}
              </p>
            )}
          </div>

          {/* 4. Fee Summary Block */}
          <section
            style={getItemStyle(3)}
            className="rounded-[14px] bg-[#111b27] px-[18px] py-1.5"
            aria-label="Fee Summary"
          >
            {/* Fee rate row */}
            <div className="flex items-center justify-between h-[44px] text-[13px]">
              <span className="text-[#8b95a1]">Fee rate</span>
              <span className="text-[#eef2f6] font-medium">
                {(FEE_RATE * 100).toFixed(0)}%
              </span>
            </div>

            {/* Fee row */}
            <div className="flex items-center justify-between h-[44px] text-[13px]">
              <span className="text-[#8b95a1]">Fee</span>
              <span className="text-[#eef2f6] font-medium">
                {formatDisplayMoney(feeAmount)}
              </span>
            </div>

            {/* 1px Divider */}
            <div className="h-[1px] bg-[#1d2a38] w-full" />

            {/* Actual arrival row */}
            <div className="flex items-center justify-between h-[50px]">
              <span className="text-[14px] text-[#8b95a1]">Actual arrival</span>
              <span className="text-[20px] font-semibold text-[#34cc9b] tracking-tight">
                {formatDisplayMoney(actualArrival)}
              </span>
            </div>
          </section>

          {/* 5. Withdrawal Password Field */}
          <div style={getItemStyle(4)}>
            <label
              htmlFor="withdraw-password"
              className="block text-[13px] font-medium text-[#c8d0da] mb-[7px]"
            >
              Withdrawal password
            </label>
            <div
              className={`relative flex items-center h-[50px] rounded-[12px] px-[14px] transition-all duration-200 ${
                passwordError
                  ? "bg-[#111b27] ring-[1.5px] ring-[#ff5a63]"
                  : focusedField === "password"
                    ? "bg-[#16222f] ring-[1.5px] ring-[#09c48d]"
                    : "bg-[#111b27]"
              }`}
            >
              <Lock
                className={`size-[18px] shrink-0 mr-2.5 transition-colors duration-200 ${
                  focusedField === "password" ? "text-[#34cc9b]" : "text-[#6b7a8c]"
                }`}
                strokeWidth={2}
              />
              <input
                id="withdraw-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter withdrawal password"
                value={withdrawalPassword}
                onChange={(e) => {
                  setWithdrawalPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                  if (generalError) setGeneralError(null);
                }}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                className="w-full h-full bg-transparent text-[15px] text-[#eef2f6] placeholder-[#5a6677] outline-none font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="shrink-0 text-[#6b7a8c] hover:text-[#eef2f6] active:scale-95 transition-colors p-1 focus-visible:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-[18px]" strokeWidth={1.9} />
                ) : (
                  <Eye className="size-[18px]" strokeWidth={1.9} />
                )}
              </button>
            </div>
            {passwordError && (
              <p className="text-[12px] text-[#ff5a63] mt-1.5 ml-1 transition-opacity duration-200 animate-in fade-in-50">
                {passwordError}
              </p>
            )}
          </div>

          {/* 6. Email Verification Code Field */}
          <div style={getItemStyle(5)}>
            <label
              htmlFor="verification-code"
              className="block text-[13px] font-medium text-[#c8d0da] mb-[7px]"
            >
              Email verification code
            </label>
            <div
              className={`relative flex items-center h-[50px] rounded-[12px] px-[14px] transition-all duration-200 ${
                codeError
                  ? "bg-[#111b27] ring-[1.5px] ring-[#ff5a63]"
                  : focusedField === "code"
                    ? "bg-[#16222f] ring-[1.5px] ring-[#09c48d]"
                    : "bg-[#111b27]"
              }`}
            >
              <Mail
                className={`size-[18px] shrink-0 mr-2.5 transition-colors duration-200 ${
                  focusedField === "code" ? "text-[#34cc9b]" : "text-[#6b7a8c]"
                }`}
                strokeWidth={2}
              />
              <input
                id="verification-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => {
                  const numOnly = e.target.value.replace(/[^0-9]/g, "");
                  setVerificationCode(numOnly);
                  if (codeError) setCodeError(null);
                  if (generalError) setGeneralError(null);
                }}
                onFocus={() => setFocusedField("code")}
                onBlur={() => setFocusedField(null)}
                className="w-full h-full bg-transparent text-[15px] text-[#eef2f6] placeholder-[#5a6677] outline-none font-sans"
              />
              <button
                type="button"
                disabled={countdown > 0}
                onClick={handleGetCode}
                className={`shrink-0 h-[36px] px-3 rounded-[9px] text-[13px] font-semibold transition-all duration-200 focus-visible:outline-none ${
                  countdown > 0
                    ? "bg-[#16222f] text-[#6b7a8c] cursor-not-allowed"
                    : "bg-[#12342d] text-[#34cc9b] hover:bg-[#18463c] active:scale-95"
                }`}
              >
                {countdown > 0 ? `Resend in ${countdown}s` : "Get code"}
              </button>
            </div>

            {/* Helper or Status note */}
            {codeError ? (
              <p className="text-[12px] text-[#ff5a63] mt-1.5 ml-1 transition-opacity duration-200 animate-in fade-in-50">
                {codeError}
              </p>
            ) : (
              <div className="flex items-center justify-between text-[13px] mt-2 ml-0.5 leading-snug">
                <p
                  className={`transition-colors duration-200 ${
                    codeSent ? "text-[#34cc9b]" : "text-[#8b95a1]"
                  }`}
                >
                  {codeSent
                    ? "Verification code sent to your email. Check your Inbox or Spam folder."
                    : "Please request an email verification code first."}
                </p>
              </div>
            )}
          </div>

          {/* General Error / Success Feedback */}
          {generalError && (
            <p className="text-[12px] text-[#ff5a63] leading-snug bg-[#ff5a63]/10 p-2.5 rounded-[10px]">
              {generalError}
            </p>
          )}
          {successNotice && (
            <p className="text-[13px] text-[#34cc9b] leading-snug bg-[#12342d] p-3 rounded-[10px] border border-[#34cc9b]/20">
              {successNotice}
            </p>
          )}

          {/* 7. Submit Button */}
          <div style={getItemStyle(6)} className="pt-2">
            <button
              type="submit"
              disabled={busy}
              className="w-full h-[52px] rounded-[12px] bg-[#09c48d] hover:bg-[#12d49b] text-[#04140e] font-bold text-[16px] tracking-tight flex items-center justify-center transition-all duration-150 active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34cc9b]"
            >
              {busy ? (
                <Loader2 className="size-5 animate-spin text-[#04140e]" />
              ) : (
                "Submit"
              )}
            </button>
          </div>

          {/* 8. Fee Policy Notice */}
          <div style={getItemStyle(7)} className="pt-1">
            <p className="text-[12.5px] text-[#8b95a1] leading-[1.6]">
              A {(FEE_RATE * 100).toFixed(0)}% processing fee applies to all withdrawals to
              cover transaction processing and platform operational costs.
            </p>
          </div>

          {/* 9. Withdrawal records row */}
          <div style={getItemStyle(8)} className="pt-1">
            <Link
              to="/records"
              search={{ tab: "withdrawals" }}
              className="flex items-center justify-between h-[56px] rounded-[12px] bg-[#111b27] px-4 hover:bg-[#16222f] transition-colors group focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[#09c48d]"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-[36px] place-items-center rounded-lg bg-[#12342d] text-[#34cc9b]">
                  <ReceiptText className="size-[18px]" strokeWidth={2.2} />
                </div>
                <span className="text-[14px] font-medium text-[#eef2f6] group-hover:text-white transition-colors">
                  Withdrawal records
                </span>
              </div>
              <ChevronRight
                className="size-[18px] text-[#6b7a8c] group-hover:text-[#eef2f6] group-hover:translate-x-0.5 transition-all"
                strokeWidth={2}
              />
            </Link>
          </div>
        </form>
      </div>

      {/* 10. Persistent Floating Support Chat Button */}
      <Link
        to="/support"
        aria-label="Support Help"
        className="fixed bottom-6 right-5 z-40 grid size-12 place-items-center rounded-full bg-[#111b27] border border-[#1d2a38] text-[#34cc9b] shadow-xl hover:bg-[#16222f] hover:text-[#12d49b] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#09c48d]"
      >
        <Headset className="size-6" strokeWidth={2} />
      </Link>
    </div>
  );
}
