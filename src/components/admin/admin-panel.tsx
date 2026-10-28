import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  GitFork,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Download,
  RefreshCw,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Menu,
  X,
  DollarSign,
  Activity,
  TrendingUp,
  UserCheck,
  ChevronRight,
  Plus,
  Minus,
  Wallet,
  Lock,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  getAdminUsers,
  getAdminWithdrawals,
  getAdminDeposits,
  fetchAdminUsersAsync,
  fetchAdminWithdrawalsAsync,
  fetchAdminDepositsAsync,
  getWeeklyChartData,
  getDashboardMetrics,
  approveWithdrawal,
  rejectWithdrawal,
  toggleUserStatus,
  adjustUserBalance,
  createAdminUser,
  approveDeposit,
  rejectDeposit,
  exportDataToCsv,
  type AdminUser,
  type AdminWithdrawal,
  type AdminDeposit,
} from "@/lib/admin-store";
import { supabase } from "@/integrations/supabase/client";

type TabView = "dashboard" | "users" | "deposits" | "withdrawals" | "referrals";

export function AdminPanel({ onLock }: { onLock?: () => void } = {}) {
  const [activeTab, setActiveTab] = useState<TabView>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chartDays, setChartDays] = useState<7 | 30>(7);
  const [timeStr, setTimeStr] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Core Data States (100% Real from Supabase & Storage)
  const [users, setUsers] = useState<AdminUser[]>(() => getAdminUsers());
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>(() => getAdminWithdrawals());
  const [deposits, setDeposits] = useState<AdminDeposit[]>(() => getAdminDeposits());
  const [metrics, setMetrics] = useState(() => getDashboardMetrics());

  // Search & Filter States
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | "active" | "blocked">("all");
  const [withdrawFilter, setWithdrawFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [depositFilter, setDepositFilter] = useState<"all" | "pending" | "completed" | "rejected">("all");

  // Modals & Action States
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [balanceAdjustUser, setBalanceAdjustUser] = useState<AdminUser | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>("");
  const [adjustType, setAdjustType] = useState<"credit" | "debit">("credit");
  const [adjustNote, setAdjustNote] = useState<string>("");

  // Add User State
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("123456");
  const [newUserBalance, setNewUserBalance] = useState("0");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserInviteCode, setNewUserInviteCode] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // DB Setup Modal State
  const [dbModalOpen, setDbModalOpen] = useState(false);

  const [inspectTeamCode, setInspectTeamCode] = useState<string | null>(null);
  const [inspectTeamName, setInspectTeamName] = useState<string>("");

  const [rejectingWithdrawal, setRejectingWithdrawal] = useState<AdminWithdrawal | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [rejectingDeposit, setRejectingDeposit] = useState<AdminDeposit | null>(null);
  const [depositRejectReason, setDepositRejectReason] = useState("");

  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null);
  const [confirmApproveDepositId, setConfirmApproveDepositId] = useState<string | null>(null);

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showNotification = useCallback((message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // Async data loader that pulls live data from Supabase and synchronizes state
  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [u, w, d] = await Promise.all([
        fetchAdminUsersAsync(),
        fetchAdminWithdrawalsAsync(),
        fetchAdminDepositsAsync(),
      ]);
      setUsers(u);
      setWithdrawals(w);
      setDeposits(d);
      setMetrics(getDashboardMetrics());
    } catch {
      setUsers(getAdminUsers());
      setWithdrawals(getAdminWithdrawals());
      setDeposits(getAdminDeposits());
      setMetrics(getDashboardMetrics());
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  }, []);

  // Clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toUTCString().replace("GMT", "UTC"));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initial load
  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Realtime Supabase listeners
  useEffect(() => {
    let channel: any;
    try {
      channel = supabase
        .channel("admin-realtime-desk")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "withdrawals" },
          (payload: any) => {
            void loadData();
            if (payload.eventType === "INSERT") {
              showNotification(
                `New withdrawal request: $${payload.new?.amount || 0} USDT (BEP20)`,
                "success"
              );
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "deposits" },
          (payload: any) => {
            void loadData();
            if (payload.eventType === "INSERT") {
              showNotification(
                `New recharge detected: $${payload.new?.amount || 0} USDT`,
                "success"
              );
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "users" },
          () => {
            void loadData();
          }
        )
        .subscribe();
    } catch {}

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [loadData, showNotification]);

  const copyToClipboard = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedText(id);
      setTimeout(() => setCopiedText(null), 2000);
    } catch {}
  };

  // Withdrawal Handlers
  const handleApproveWithdrawal = async (id: string) => {
    const updated = await approveWithdrawal(id);
    setWithdrawals(updated);
    setMetrics(getDashboardMetrics());
    setConfirmApproveId(null);
    showNotification(`Withdrawal #${id.slice(-6)} approved. Payout broadcasted.`);
  };

  const handleRejectWithdrawal = async () => {
    if (!rejectingWithdrawal) return;
    const reasonText = rejectReason.trim() || "Rejected by administrator. Funds refunded to wallet.";
    const updated = await rejectWithdrawal(rejectingWithdrawal.id, reasonText);
    setWithdrawals(updated);
    setUsers(getAdminUsers());
    setMetrics(getDashboardMetrics());
    showNotification(
      `Withdrawal rejected. $${rejectingWithdrawal.amount.toFixed(2)} USDT refunded to user's wallet.`
    );
    setRejectingWithdrawal(null);
    setRejectReason("");
  };

  // Deposit / Recharge Handlers
  const handleApproveDeposit = (id: string) => {
    const updated = approveDeposit(id);
    setDeposits(updated);
    setUsers(getAdminUsers());
    setMetrics(getDashboardMetrics());
    setConfirmApproveDepositId(null);
    showNotification(`Recharge #${id.slice(-6)} approved and credited to user's wallet.`);
  };

  const handleRejectDeposit = () => {
    if (!rejectingDeposit) return;
    const reason = depositRejectReason.trim() || "Invalid transaction hash or unconfirmed block.";
    const updated = rejectDeposit(rejectingDeposit.id, reason);
    setDeposits(updated);
    setMetrics(getDashboardMetrics());
    showNotification(`Recharge #${rejectingDeposit.id.slice(-6)} marked as rejected.`);
    setRejectingDeposit(null);
    setDepositRejectReason("");
  };

  const handleToggleUser = (userId: string) => {
    const updated = toggleUserStatus(userId);
    setUsers(updated);
    setMetrics(getDashboardMetrics());
    const target = updated.find(u => u.id === userId);
    showNotification(
      `User ${target?.email || userId} is now ${target?.status === "blocked" ? "BLOCKED" : "ACTIVE"}.`
    );
  };

  const handleAdjustBalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceAdjustUser) return;
    const amountNum = parseFloat(adjustAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showNotification("Please enter a valid positive amount", "error");
      return;
    }
    const delta = adjustType === "credit" ? amountNum : -amountNum;
    const updated = adjustUserBalance(
      balanceAdjustUser.id,
      delta,
      adjustNote.trim() || `Admin manual ${adjustType}`
    );
    setUsers(updated);
    setMetrics(getDashboardMetrics());
    showNotification(
      `Wallet for ${balanceAdjustUser.name} ${adjustType === "credit" ? "credited" : "debited"} by $${amountNum.toFixed(2)} USDT.`
    );
    setBalanceAdjustUser(null);
    setAdjustAmount("");
    setAdjustNote("");
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) {
      showNotification("User's full name is required", "error");
      return;
    }
    if (!newUserEmail.trim()) {
      showNotification("Email address is required", "error");
      return;
    }
    setIsCreatingUser(true);
    try {
      const created = await createAdminUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword.trim() || "123456",
        balance: parseFloat(newUserBalance) || 0,
        phone: newUserPhone.trim(),
        invite_code: newUserInviteCode.trim(),
      });
      await loadData();
      showNotification(
        `User ${created.name} (${created.email}) created successfully with $${created.balance.toFixed(2)} USDT!`
      );
      setAddUserModalOpen(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("123456");
      setNewUserBalance("0");
      setNewUserPhone("");
      setNewUserInviteCode("");
    } catch (err: any) {
      showNotification(err?.message || "Failed to create user", "error");
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Chart data
  const chartData = useMemo(() => getWeeklyChartData(chartDays), [chartDays, deposits, withdrawals]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = userSearch.toLowerCase();
      const matchesQuery =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q)) ||
        (u.invite_code && u.invite_code.toLowerCase().includes(q)) ||
        (u.referred_by && u.referred_by.toLowerCase().includes(q));

      const matchesStatus =
        userStatusFilter === "all" || u.status === userStatusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [users, userSearch, userStatusFilter]);

  // Filtered Withdrawals
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter(w => {
      if (withdrawFilter === "all") return true;
      return w.status === withdrawFilter;
    });
  }, [withdrawals, withdrawFilter]);

  // Filtered Deposits
  const filteredDeposits = useMemo(() => {
    return deposits.filter(d => {
      if (depositFilter === "all") return true;
      return d.status === depositFilter;
    });
  }, [deposits, depositFilter]);

  // Referral Network
  const referralNetwork = useMemo(() => {
    const map = new Map<string, { referrer: AdminUser; members: AdminUser[]; todayCount: number }>();
    const todayStr = new Date().toISOString().slice(0, 10);

    users.forEach(u => {
      const code = (u.invite_code || "").toUpperCase();
      if (!code) return;
      map.set(code, { referrer: u, members: [], todayCount: 0 });
    });

    users.forEach(member => {
      const refCode = (member.referred_by || "").toUpperCase();
      if (refCode && map.has(refCode)) {
        const item = map.get(refCode)!;
        item.members.push(member);
        if (member.created_at.slice(0, 10) === todayStr) {
          item.todayCount += 1;
        }
      }
    });

    const list = Array.from(map.values()).filter(i => i.members.length > 0 || i.referrer.role === "admin");
    return list.sort((a, b) => b.members.length - a.members.length);
  }, [users]);

  const downlineMembersForModal = useMemo(() => {
    if (!inspectTeamCode) return [];
    const upper = inspectTeamCode.toUpperCase();
    return users.filter(u => (u.referred_by || "").toUpperCase() === upper);
  }, [users, inspectTeamCode]);

  return (
    <div className="min-h-screen bg-[#070c14] text-[#e8edf2] font-sans selection:bg-[#09c48d]/20 selection:text-[#09c48d]">
      {/* Top Notification Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md animate-in slide-in-from-top-3 ${
            notification.type === "success"
              ? "bg-[#0b241d]/90 border-[#09c48d]/40 text-[#34cc9b]"
              : "bg-[#291014]/90 border-[#ff5a63]/40 text-[#ff7078]"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="size-5 shrink-0" />
          ) : (
            <AlertCircle className="size-5 shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Main Layout Container */}
      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-64 flex-col border-r border-[#15202f] bg-[#090f1a] shrink-0">
          {/* Brand */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-[#15202f]">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="size-8 rounded-lg bg-gradient-to-tr from-[#09c48d] to-[#00d4ff] grid place-items-center text-[#04140e] font-black text-base shadow-lg shadow-[#09c48d]/20">
                V
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-white group-hover:text-[#09c48d] transition-colors">
                  VERTEX PRO
                </span>
                <span className="text-[10px] font-mono text-[#627387] uppercase tracking-wider">
                  Live Operations
                </span>
              </div>
            </Link>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#09c48d]/10 text-[#09c48d] border border-[#09c48d]/20">
              PRO
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
            {/* Dashboard */}
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === "dashboard"
                  ? "bg-[#111c2a] text-white border border-[#1b2b3f] shadow-inner"
                  : "text-[#8796a8] hover:bg-[#0e1622] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className={`size-4.5 ${activeTab === "dashboard" ? "text-[#09c48d]" : "text-[#5a6a7c]"}`} />
                <span>Dashboard</span>
              </div>
            </button>

            {/* Users */}
            <button
              onClick={() => setActiveTab("users")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === "users"
                  ? "bg-[#111c2a] text-white border border-[#1b2b3f] shadow-inner"
                  : "text-[#8796a8] hover:bg-[#0e1622] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className={`size-4.5 ${activeTab === "users" ? "text-[#09c48d]" : "text-[#5a6a7c]"}`} />
                <span>User Management</span>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#162334] text-[#8aa0b6]">
                {metrics.totalUsers}
              </span>
            </button>

            {/* Recharge / Deposits */}
            <button
              onClick={() => setActiveTab("deposits")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === "deposits"
                  ? "bg-[#111c2a] text-white border border-[#1b2b3f] shadow-inner"
                  : "text-[#8796a8] hover:bg-[#0e1622] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <ArrowUpRight className={`size-4.5 ${activeTab === "deposits" ? "text-[#09c48d]" : "text-[#5a6a7c]"}`} />
                <span>Recharge Requests</span>
              </div>
              {metrics.pendingDepositCount > 0 ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#09c48d] text-[#04140e] animate-pulse">
                  {metrics.pendingDepositCount}
                </span>
              ) : (
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#162334] text-[#8aa0b6]">
                  {deposits.length}
                </span>
              )}
            </button>

            {/* Withdrawals */}
            <button
              onClick={() => setActiveTab("withdrawals")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === "withdrawals"
                  ? "bg-[#111c2a] text-white border border-[#1b2b3f] shadow-inner"
                  : "text-[#8796a8] hover:bg-[#0e1622] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <ArrowDownRight className={`size-4.5 ${activeTab === "withdrawals" ? "text-[#09c48d]" : "text-[#5a6a7c]"}`} />
                <span>Withdraw Requests</span>
              </div>
              {metrics.pendingCount > 0 ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#ff5a63] text-[#1a0507] animate-pulse">
                  {metrics.pendingCount}
                </span>
              ) : (
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#162334] text-[#8aa0b6]">
                  {withdrawals.length}
                </span>
              )}
            </button>

            {/* Referrals */}
            <button
              onClick={() => setActiveTab("referrals")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === "referrals"
                  ? "bg-[#111c2a] text-white border border-[#1b2b3f] shadow-inner"
                  : "text-[#8796a8] hover:bg-[#0e1622] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <GitFork className={`size-4.5 ${activeTab === "referrals" ? "text-[#09c48d]" : "text-[#5a6a7c]"}`} />
                <span>Referral Network</span>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#162334] text-[#8aa0b6]">
                {referralNetwork.length}
              </span>
            </button>
          </nav>

          {/* Sidebar System Card */}
          <div className="p-3 border-t border-[#15202f] space-y-2">
            <div className="p-3 rounded-xl bg-[#0e1622] border border-[#172332] space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#09c48d] animate-ping" />
                <span className="text-xs font-medium text-[#c0cbd8]">Supabase Live Sync</span>
              </div>
              <p className="text-[11px] text-[#6b7b8f] leading-relaxed">
                Listening for real user registrations, recharges, and BEP20 withdrawals.
              </p>
            </div>
            <Link
              to="/"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-medium text-[#8aa0b6] hover:text-white hover:bg-[#121c2a] transition-colors"
            >
              <ExternalLink className="size-3.5" />
              <span>Back to Exchange</span>
            </Link>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Header */}
          <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-[#15202f] bg-[#090f1a]/80 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg text-[#8796a8] hover:text-white hover:bg-[#111c2a]"
                aria-label="Open navigation menu"
              >
                <Menu className="size-5" />
              </button>
              <div>
                <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                  <span>
                    {activeTab === "dashboard" && "Platform Operations Overview"}
                    {activeTab === "users" && "User Account Registry"}
                    {activeTab === "deposits" && "Recharge & Deposit Desk"}
                    {activeTab === "withdrawals" && "Withdrawal Processing Desk (BEP20)"}
                    {activeTab === "referrals" && "Referral & Affiliate Tree"}
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#09c48d]/10 text-[#09c48d] border border-[#09c48d]/25">
                    <span className="size-1.5 rounded-full bg-[#09c48d]" />
                    Realtime Sync
                  </span>
                </h1>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e1622] border border-[#172332] text-xs font-mono text-[#8aa0b6]">
                <Clock className="size-3.5 text-[#09c48d]" />
                <span>{timeStr || "Loading..."}</span>
              </div>

              <button
                onClick={loadData}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111c2a] hover:bg-[#172436] border border-[#1b2b3f] text-xs font-medium text-[#c0cbd8] transition-all disabled:opacity-50"
                title="Refresh real data from database"
              >
                <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin text-[#09c48d]" : ""}`} />
                <span className="hidden sm:inline">Sync Cloud</span>
              </button>

              {/* Database SQL Setup Modal Trigger */}
              <button
                onClick={() => setDbModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 border border-[#00d4ff]/30 text-xs font-semibold text-[#00d4ff] transition-all"
                title="View Supabase Cloud SQL setup"
              >
                <Wallet className="size-3.5" />
                <span className="hidden sm:inline">Supabase Fix</span>
              </button>

              {/* Export Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#09c48d]/10 hover:bg-[#09c48d]/20 border border-[#09c48d]/30 text-xs font-semibold text-[#09c48d] transition-all">
                  <Download className="size-3.5" />
                  <span className="hidden sm:inline">Export Audit</span>
                </button>
                <div className="absolute right-0 mt-1 w-44 rounded-xl bg-[#0f1825] border border-[#1e2f44] shadow-2xl p-1.5 hidden group-hover:block z-50 animate-in fade-in-50">
                  <button
                    onClick={() => exportDataToCsv("users")}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#c0cbd8] hover:bg-[#152335] hover:text-white transition-colors"
                  >
                    Export Users (.csv)
                  </button>
                  <button
                    onClick={() => exportDataToCsv("withdrawals")}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#c0cbd8] hover:bg-[#152335] hover:text-white transition-colors"
                  >
                    Export Withdrawals (.csv)
                  </button>
                  <button
                    onClick={() => exportDataToCsv("deposits")}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#c0cbd8] hover:bg-[#152335] hover:text-white transition-colors"
                  >
                    Export Deposits (.csv)
                  </button>
                </div>
              </div>

              {/* Lock Session Button */}
              {onLock && (
                <button
                  onClick={onLock}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#291014] hover:bg-[#3d161d] border border-[#ff5a63]/30 text-xs font-semibold text-[#ff7078] transition-all"
                  title="Lock admin session"
                >
                  <Lock className="size-3.5" />
                  <span className="hidden sm:inline">Lock Desk</span>
                </button>
              )}
            </div>
          </header>

          {/* Main Scrollable View */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
            {/* ============================================================== */}
            {/* VIEW 1: DASHBOARD */}
            {/* ============================================================== */}
            {activeTab === "dashboard" && (
              <div className="space-y-6 max-w-7xl mx-auto">
                {/* 6 Top Metric Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
                  {/* Total Deposit */}
                  <div className="p-4 rounded-2xl bg-[#0c1421] border border-[#162334] relative overflow-hidden group hover:border-[#1e3047] transition-all">
                    <div className="flex items-center justify-between text-[#8aa0b6] mb-2">
                      <span className="text-[12px] font-medium tracking-tight">Total Deposits</span>
                      <div className="size-7 rounded-lg bg-[#09c48d]/10 grid place-items-center text-[#09c48d]">
                        <ArrowUpRight className="size-4" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
                      ${metrics.totalDeposit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-[#6b7b8f] mt-1">Lifetime completed</p>
                  </div>

                  {/* Today Deposit */}
                  <div className="p-4 rounded-2xl bg-[#0c1421] border border-[#162334] relative overflow-hidden group hover:border-[#1e3047] transition-all">
                    <div className="flex items-center justify-between text-[#8aa0b6] mb-2">
                      <span className="text-[12px] font-medium tracking-tight">Today's Deposit</span>
                      <div className="size-7 rounded-lg bg-[#09c48d]/10 grid place-items-center text-[#09c48d]">
                        <Activity className="size-4" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold font-mono text-[#09c48d] tracking-tight">
                      ${metrics.todayDeposit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-[#6b7b8f] mt-1">Last 24h real volume</p>
                  </div>

                  {/* Total Withdraw */}
                  <div className="p-4 rounded-2xl bg-[#0c1421] border border-[#162334] relative overflow-hidden group hover:border-[#1e3047] transition-all">
                    <div className="flex items-center justify-between text-[#8aa0b6] mb-2">
                      <span className="text-[12px] font-medium tracking-tight">Total Withdrawn</span>
                      <div className="size-7 rounded-lg bg-[#ff5a63]/10 grid place-items-center text-[#ff5a63]">
                        <ArrowDownRight className="size-4" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
                      ${metrics.totalWithdraw.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-[#6b7b8f] mt-1">Lifetime approved</p>
                  </div>

                  {/* Today Withdraw */}
                  <div className="p-4 rounded-2xl bg-[#0c1421] border border-[#162334] relative overflow-hidden group hover:border-[#1e3047] transition-all">
                    <div className="flex items-center justify-between text-[#8aa0b6] mb-2">
                      <span className="text-[12px] font-medium tracking-tight">Today's Payouts</span>
                      <div className="size-7 rounded-lg bg-[#ff5a63]/10 grid place-items-center text-[#ff5a63]">
                        <TrendingUp className="size-4" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold font-mono text-[#ff5a63] tracking-tight">
                      ${metrics.todayWithdraw.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-[#6b7b8f] mt-1">Last 24h approved</p>
                  </div>

                  {/* Pending Queue */}
                  <div className="p-4 rounded-2xl bg-[#0c1421] border border-[#162334] relative overflow-hidden group hover:border-[#1e3047] transition-all">
                    <div className="flex items-center justify-between text-[#8aa0b6] mb-2">
                      <span className="text-[12px] font-medium tracking-tight">Pending Withdrawals</span>
                      <div className={`size-7 rounded-lg grid place-items-center ${metrics.pendingCount > 0 ? "bg-[#ffaa00]/15 text-[#ffaa00]" : "bg-[#152334] text-[#6b7b8f]"}`}>
                        <Clock className="size-4" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight flex items-baseline gap-1.5">
                      <span>{metrics.pendingCount}</span>
                      <span className="text-xs text-[#8aa0b6] font-normal">
                        (${metrics.pendingAmount.toFixed(0)})
                      </span>
                    </div>
                    <p className="text-[11px] text-[#ffaa00] mt-1">
                      {metrics.pendingCount > 0 ? "Requires review" : "Queue clear"}
                    </p>
                  </div>

                  {/* Platform Users */}
                  <div className="p-4 rounded-2xl bg-[#0c1421] border border-[#162334] relative overflow-hidden group hover:border-[#1e3047] transition-all">
                    <div className="flex items-center justify-between text-[#8aa0b6] mb-2">
                      <span className="text-[12px] font-medium tracking-tight">Registered Users</span>
                      <div className="size-7 rounded-lg bg-[#00d4ff]/10 grid place-items-center text-[#00d4ff]">
                        <Users className="size-4" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
                      {metrics.totalUsers}
                    </div>
                    <p className="text-[11px] text-[#6b7b8f] mt-1">
                      {metrics.activeUsers} active · {metrics.blockedUsers} blocked
                    </p>
                  </div>
                </div>

                {/* Real Financial Volume Chart */}
                <div className="p-5 sm:p-6 rounded-2xl bg-[#0c1421] border border-[#162334] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-white tracking-tight">
                        Cash Flow Dynamics: Deposit vs Withdrawal Volume
                      </h2>
                      <p className="text-xs text-[#6b7b8f] mt-0.5">
                        Calculated strictly from actual platform transactions across the selected period.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-[#070d16] p-1 rounded-xl border border-[#152335]">
                        <button
                          onClick={() => setChartDays(7)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                            chartDays === 7 ? "bg-[#162538] text-white" : "text-[#7b8c9f] hover:text-white"
                          }`}
                        >
                          7 Days
                        </button>
                        <button
                          onClick={() => setChartDays(30)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                            chartDays === 30 ? "bg-[#162538] text-white" : "text-[#7b8c9f] hover:text-white"
                          }`}
                        >
                          30 Days
                        </button>
                      </div>

                      <div className="hidden sm:flex items-center gap-3 text-xs font-medium pl-2">
                        <div className="flex items-center gap-1.5 text-[#09c48d]">
                          <span className="size-2 rounded-full bg-[#09c48d]" />
                          <span>Deposit</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#ff5a63]">
                          <span className="size-2 rounded-full bg-[#ff5a63]" />
                          <span>Withdrawal</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-[280px] w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="depositGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#09c48d" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#09c48d" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="withdrawGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ff5a63" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#ff5a63" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#142131" vertical={false} />
                        <XAxis
                          dataKey="date"
                          stroke="#48596c"
                          fontSize={11}
                          tickLine={false}
                          axisLine={{ stroke: "#172638" }}
                        />
                        <YAxis
                          stroke="#48596c"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `$${v}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0d1826",
                            borderColor: "#1e3146",
                            borderRadius: "12px",
                            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
                            color: "#e8edf2",
                            fontSize: "12px",
                          }}
                          formatter={(value: any) => [`$${Number(value || 0).toFixed(2)} USDT`, ""]}
                        />
                        <Area
                          type="monotone"
                          dataKey="deposit"
                          name="Deposits"
                          stroke="#09c48d"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#depositGrad)"
                        />
                        <Area
                          type="monotone"
                          dataKey="withdraw"
                          name="Withdrawals"
                          stroke="#ff5a63"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#withdrawGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Summary Bar Under Chart */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#162334]">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#080e18] border border-[#142131]">
                      <span className="text-xs text-[#7b8c9f]">Net Platform Flow:</span>
                      <span className={`text-sm font-bold font-mono ${metrics.netFlow >= 0 ? "text-[#09c48d]" : "text-[#ff5a63]"}`}>
                        {metrics.netFlow >= 0 ? "+" : ""}${metrics.netFlow.toFixed(2)} USDT
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#080e18] border border-[#142131]">
                      <span className="text-xs text-[#7b8c9f]">System Liquidity:</span>
                      <span className="text-sm font-bold font-mono text-white">
                        100% Solvent
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#080e18] border border-[#142131]">
                      <span className="text-xs text-[#7b8c9f]">Pending Liability:</span>
                      <span className="text-sm font-bold font-mono text-[#ffaa00]">
                        ${metrics.pendingAmount.toFixed(2)} USDT
                      </span>
                    </div>
                  </div>
                </div>

                {/* Two Real Feeds: Recent Transactions & New Signups */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Real Transactions */}
                  <div className="p-5 rounded-2xl bg-[#0c1421] border border-[#162334] space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                        <Activity className="size-4 text-[#09c48d]" />
                        <span>Recent Realtime Transactions</span>
                      </h3>
                      <button
                        onClick={() => setActiveTab("withdrawals")}
                        className="text-xs text-[#09c48d] hover:underline flex items-center gap-1 font-medium"
                      >
                        View All <ChevronRight className="size-3" />
                      </button>
                    </div>

                    {withdrawals.length === 0 && deposits.length === 0 ? (
                      <div className="py-12 text-center text-[#5a6a7c] text-xs">
                        No transactions recorded yet. Real user deposits and withdrawals will stream here live.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {[...withdrawals.map(w => ({ ...w, type: "withdraw" as const })), ...deposits.map(d => ({ ...d, type: "deposit" as const }))]
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .slice(0, 5)
                          .map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-[#080e18] border border-[#142131] hover:border-[#1c2e42] transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`size-8 rounded-lg grid place-items-center shrink-0 ${
                                    item.type === "deposit"
                                      ? "bg-[#09c48d]/10 text-[#09c48d]"
                                      : "bg-[#ff5a63]/10 text-[#ff5a63]"
                                  }`}
                                >
                                  {item.type === "deposit" ? (
                                    <ArrowUpRight className="size-4" />
                                  ) : (
                                    <ArrowDownRight className="size-4" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-white truncate">
                                    {item.user_name || "Vertex Member"}
                                  </div>
                                  <div className="text-[11px] text-[#6b7b8f] truncate font-mono">
                                    {item.type.toUpperCase()} · {item.network}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div
                                  className={`text-xs font-bold font-mono ${
                                    item.type === "deposit" ? "text-[#09c48d]" : "text-[#ff5a63]"
                                  }`}
                                >
                                  {item.type === "deposit" ? "+" : "-"}${item.amount.toFixed(2)}
                                </div>
                                <span
                                  className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase ${
                                    item.status === "completed" || item.status === "approved"
                                      ? "bg-[#09c48d]/10 text-[#09c48d]"
                                      : item.status === "pending"
                                      ? "bg-[#ffaa00]/15 text-[#ffaa00]"
                                      : "bg-[#ff5a63]/10 text-[#ff5a63]"
                                  }`}
                                >
                                  {item.status}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Recently Registered Users */}
                  <div className="p-5 rounded-2xl bg-[#0c1421] border border-[#162334] space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                        <UserCheck className="size-4 text-[#00d4ff]" />
                        <span>Recently Registered Accounts</span>
                      </h3>
                      <button
                        onClick={() => setActiveTab("users")}
                        className="text-xs text-[#00d4ff] hover:underline flex items-center gap-1 font-medium"
                      >
                        View All <ChevronRight className="size-3" />
                      </button>
                    </div>

                    {users.length === 0 ? (
                      <div className="py-12 text-center text-[#5a6a7c] text-xs">
                        No registered users yet. Newly created accounts will automatically populate here.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {users.slice(0, 5).map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-[#080e18] border border-[#142131] hover:border-[#1c2e42] transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="size-8 rounded-lg bg-[#142337] text-[#00d4ff] grid place-items-center font-bold text-xs uppercase shrink-0">
                                {user.name.slice(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-white truncate flex items-center gap-2">
                                  <span>{user.name}</span>
                                  {user.status === "blocked" && (
                                    <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-[#ff5a63]/20 text-[#ff5a63]">
                                      BLOCKED
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-[#6b7b8f] truncate font-mono">
                                  {user.email}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-xs font-bold font-mono text-white">
                                ${user.balance.toFixed(2)} USDT
                              </div>
                              <span className="text-[10px] text-[#6b7b8f] font-mono">
                                Code: {user.invite_code || "—"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* VIEW 2: USER MANAGEMENT */}
            {/* ============================================================== */}
            {activeTab === "users" && (
              <div className="space-y-4 max-w-7xl mx-auto">
                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between p-4 rounded-2xl bg-[#0c1421] border border-[#162334]">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#5a6a7c]" />
                    <input
                      type="text"
                      placeholder="Search users by name, email, phone, or referral code..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#080e18] border border-[#172537] text-xs text-white placeholder-[#5a6a7c] focus:outline-none focus:border-[#09c48d]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-[#080e18] p-1 rounded-xl border border-[#172537]">
                      <button
                        onClick={() => setUserStatusFilter("all")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          userStatusFilter === "all" ? "bg-[#162538] text-white" : "text-[#7b8c9f]"
                        }`}
                      >
                        All ({users.length})
                      </button>
                      <button
                        onClick={() => setUserStatusFilter("active")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          userStatusFilter === "active" ? "bg-[#162538] text-white" : "text-[#7b8c9f]"
                        }`}
                      >
                        Active ({metrics.activeUsers})
                      </button>
                      <button
                        onClick={() => setUserStatusFilter("blocked")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          userStatusFilter === "blocked" ? "bg-[#162538] text-white" : "text-[#7b8c9f]"
                        }`}
                      >
                        Blocked ({metrics.blockedUsers})
                      </button>
                    </div>

                    <button
                      onClick={() => setAddUserModalOpen(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#09c48d] hover:bg-[#0bd69a] text-[#04140e] text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer"
                    >
                      <Plus className="size-4 stroke-[2.5]" />
                      <span>Add User</span>
                    </button>
                  </div>
                </div>

                {/* Users Table */}
                <div className="rounded-2xl bg-[#0c1421] border border-[#162334] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#162334] bg-[#090f1a] text-[11px] font-semibold text-[#6b7b8f] uppercase tracking-wider">
                          <th className="py-3.5 px-4">User</th>
                          <th className="py-3.5 px-4">Referral Code</th>
                          <th className="py-3.5 px-4">Wallet Balance</th>
                          <th className="py-3.5 px-4">Frozen AI Fund</th>
                          <th className="py-3.5 px-4">Deposited / Withdrawn</th>
                          <th className="py-3.5 px-4">Registered Date</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#131f2e] text-xs">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-16 text-center text-[#5a6a7c]">
                              <Users className="size-8 mx-auto mb-2 opacity-30" />
                              <div className="text-sm font-semibold text-[#8aa0b6]">No Users Found</div>
                              <p className="text-xs text-[#5a6a7c] mt-1">
                                {userSearch
                                  ? "No registered user matches your search query."
                                  : "Users will automatically appear here once registered on the platform."}
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-[#0e1724] transition-colors">
                              {/* Name & Email */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="size-8 rounded-lg bg-[#142337] text-[#00d4ff] grid place-items-center font-bold text-xs uppercase shrink-0">
                                    {user.name.slice(0, 2)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-semibold text-white truncate">{user.name}</div>
                                    <div className="text-[11px] text-[#6b7b8f] font-mono truncate">{user.email}</div>
                                  </div>
                                </div>
                              </td>

                              {/* Invite Code & Inviter */}
                              <td className="py-3.5 px-4">
                                <div className="font-mono text-white flex items-center gap-1.5">
                                  <span>{user.invite_code || "—"}</span>
                                  {user.invite_code && (
                                    <button
                                      onClick={() => copyToClipboard(user.invite_code!, `uc_${user.id}`)}
                                      className="text-[#5a6a7c] hover:text-[#09c48d]"
                                    >
                                      {copiedText === `uc_${user.id}` ? (
                                        <Check className="size-3 text-[#09c48d]" />
                                      ) : (
                                        <Copy className="size-3" />
                                      )}
                                    </button>
                                  )}
                                </div>
                                <div className="text-[10px] text-[#6b7b8f]">
                                  Ref: {user.referred_by || "Direct / System"}
                                </div>
                              </td>

                              {/* Wallet Balance */}
                              <td className="py-3.5 px-4 font-mono font-bold text-white">
                                ${user.balance.toFixed(2)} USDT
                              </td>

                              {/* Frozen AI Fund */}
                              <td className="py-3.5 px-4 font-mono text-[#00d4ff]">
                                ${user.frozen_balance.toFixed(2)} USDT
                                <div className="text-[10px] text-[#6b7b8f]">Auto 3-Day Lock</div>
                              </td>

                              {/* Dep / With */}
                              <td className="py-3.5 px-4 font-mono">
                                <span className="text-[#09c48d]">+${user.total_deposit.toFixed(2)}</span>
                                <span className="text-[#5a6a7c] mx-1">/</span>
                                <span className="text-[#ff5a63]">-${user.total_withdraw.toFixed(2)}</span>
                              </td>

                              {/* Registered Date */}
                              <td className="py-3.5 px-4 text-[#8aa0b6] font-mono text-[11px]">
                                {new Date(user.created_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </td>

                              {/* Status */}
                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    user.status === "active"
                                      ? "bg-[#09c48d]/10 text-[#09c48d] border border-[#09c48d]/30"
                                      : "bg-[#ff5a63]/10 text-[#ff5a63] border border-[#ff5a63]/30"
                                  }`}
                                >
                                  <span
                                    className={`size-1.5 rounded-full ${
                                      user.status === "active" ? "bg-[#09c48d]" : "bg-[#ff5a63]"
                                    }`}
                                  />
                                  {user.status === "active" ? "Active" : "Blocked"}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setSelectedUser(user)}
                                    className="px-2.5 py-1 rounded-lg bg-[#142337] hover:bg-[#1a2e47] text-white text-[11px] font-medium transition-colors"
                                  >
                                    Details
                                  </button>

                                  <button
                                    onClick={() => {
                                      setBalanceAdjustUser(user);
                                      setAdjustType("credit");
                                      setAdjustAmount("");
                                      setAdjustNote("Admin manual recharge");
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-[#09c48d]/15 hover:bg-[#09c48d]/25 text-[#09c48d] text-[11px] font-bold border border-[#09c48d]/30 transition-all flex items-center gap-1 shadow-sm"
                                    title="Give / Add balance to this user"
                                  >
                                    <DollarSign className="size-3 stroke-[2.5]" />
                                    <span>Give Balance</span>
                                  </button>

                                  <button
                                    onClick={() => handleToggleUser(user.id)}
                                    className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                                      user.status === "active"
                                        ? "bg-[#ff5a63]/10 text-[#ff5a63] hover:bg-[#ff5a63]/20"
                                        : "bg-[#09c48d]/10 text-[#09c48d] hover:bg-[#09c48d]/20"
                                    }`}
                                  >
                                    {user.status === "active" ? "Block" : "Unblock"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* VIEW 3: RECHARGE REQUESTS (DEPOSITS) */}
            {/* ============================================================== */}
            {activeTab === "deposits" && (
              <div className="space-y-4 max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0c1421] border border-[#162334]">
                  <div className="flex items-center gap-1.5 bg-[#080e18] p-1 rounded-xl border border-[#172537]">
                    <button
                      onClick={() => setDepositFilter("all")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        depositFilter === "all" ? "bg-[#162538] text-white" : "text-[#7b8c9f]"
                      }`}
                    >
                      All Recharges ({deposits.length})
                    </button>
                    <button
                      onClick={() => setDepositFilter("pending")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        depositFilter === "pending"
                          ? "bg-[#ffaa00]/20 text-[#ffaa00] border border-[#ffaa00]/30"
                          : "text-[#7b8c9f]"
                      }`}
                    >
                      <span>Pending Review</span>
                      {metrics.pendingDepositCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[#ffaa00] text-[#0d1421] text-[10px] font-bold">
                          {metrics.pendingDepositCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setDepositFilter("completed")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        depositFilter === "completed"
                          ? "bg-[#09c48d]/20 text-[#09c48d] border border-[#09c48d]/30"
                          : "text-[#7b8c9f]"
                      }`}
                    >
                      Completed ({deposits.filter(d => d.status === "completed").length})
                    </button>
                    <button
                      onClick={() => setDepositFilter("rejected")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        depositFilter === "rejected"
                          ? "bg-[#ff5a63]/20 text-[#ff5a63] border border-[#ff5a63]/30"
                          : "text-[#7b8c9f]"
                      }`}
                    >
                      Rejected ({deposits.filter(d => d.status === "rejected").length})
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#8aa0b6] font-mono">
                    <span className="size-2 rounded-full bg-[#09c48d] animate-pulse" />
                    <span>Realtime Deposit Listener Active</span>
                  </div>
                </div>

                {/* Deposits Table */}
                <div className="rounded-2xl bg-[#0c1421] border border-[#162334] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#162334] bg-[#090f1a] text-[11px] font-semibold text-[#6b7b8f] uppercase tracking-wider">
                          <th className="py-3.5 px-4">Recharge ID</th>
                          <th className="py-3.5 px-4">User Details</th>
                          <th className="py-3.5 px-4">Recharge Amount</th>
                          <th className="py-3.5 px-4">Network</th>
                          <th className="py-3.5 px-4">Blockchain TX Hash</th>
                          <th className="py-3.5 px-4">Submitted Date</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#131f2e] text-xs">
                        {filteredDeposits.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-16 text-center text-[#5a6a7c]">
                              <ArrowUpRight className="size-8 mx-auto mb-2 opacity-30" />
                              <div className="text-sm font-semibold text-[#8aa0b6]">No Recharge Records Found</div>
                              <p className="text-xs text-[#5a6a7c] mt-1">
                                When a user submits a USDT recharge TX Hash on the site, it will stream here in realtime.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredDeposits.map((item) => (
                            <tr key={item.id} className="hover:bg-[#0e1724] transition-colors">
                              <td className="py-3.5 px-4 font-mono text-[11px] text-[#8aa0b6]">
                                #{item.id.slice(-6)}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-white">{item.user_name}</div>
                                <div className="text-[11px] text-[#6b7b8f] font-mono">{item.user_email}</div>
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-[#09c48d] text-sm">
                                +${item.amount.toFixed(2)} USDT
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#121f2f] text-[#c0cbd8] border border-[#1d3148]">
                                  {item.network}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#00d4ff] max-w-[160px]">
                                  <span className="truncate">{item.tx_hash}</span>
                                  <button
                                    onClick={() => copyToClipboard(item.tx_hash, `tx_${item.id}`)}
                                    className="text-[#6b7b8f] hover:text-[#09c48d] shrink-0"
                                    title="Copy TX Hash"
                                  >
                                    {copiedText === `tx_${item.id}` ? (
                                      <Check className="size-3 text-[#09c48d]" />
                                    ) : (
                                      <Copy className="size-3" />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-[#8aa0b6] font-mono text-[11px]">
                                {new Date(item.created_at).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                    item.status === "completed"
                                      ? "bg-[#09c48d]/15 text-[#09c48d] border border-[#09c48d]/30"
                                      : item.status === "pending"
                                      ? "bg-[#ffaa00]/15 text-[#ffaa00] border border-[#ffaa00]/30"
                                      : "bg-[#ff5a63]/15 text-[#ff5a63] border border-[#ff5a63]/30"
                                  }`}
                                >
                                  <span
                                    className={`size-1.5 rounded-full ${
                                      item.status === "completed"
                                        ? "bg-[#09c48d]"
                                        : item.status === "pending"
                                        ? "bg-[#ffaa00] animate-ping"
                                        : "bg-[#ff5a63]"
                                    }`}
                                  />
                                  {item.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {item.status === "pending" ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => setConfirmApproveDepositId(item.id)}
                                      className="px-2.5 py-1 rounded-lg bg-[#09c48d] hover:bg-[#0bd69a] text-[#04140e] text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                    >
                                      <Check className="size-3.5 stroke-[2.5]" />
                                      <span>Approve</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setRejectingDeposit(item);
                                        setDepositRejectReason("");
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-[#ff5a63]/15 hover:bg-[#ff5a63]/25 text-[#ff5a63] text-xs font-semibold border border-[#ff5a63]/30 transition-all flex items-center gap-1"
                                    >
                                      <X className="size-3.5 stroke-[2.5]" />
                                      <span>Reject</span>
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-[#5a6a7c] font-mono">
                                    {item.status === "completed" ? "Credited" : "Rejected"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* VIEW 4: WITHDRAWAL REQUESTS (BEP20 ADDRESS HIGHLIGHTED) */}
            {/* ============================================================== */}
            {activeTab === "withdrawals" && (
              <div className="space-y-4 max-w-7xl mx-auto">
                {/* Header Filter Tabs */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0c1421] border border-[#162334]">
                  <div className="flex items-center gap-1.5 bg-[#080e18] p-1 rounded-xl border border-[#172537] overflow-x-auto">
                    <button
                      onClick={() => setWithdrawFilter("pending")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
                        withdrawFilter === "pending"
                          ? "bg-[#ffaa00]/20 text-[#ffaa00] border border-[#ffaa00]/30"
                          : "text-[#7b8c9f] hover:text-white"
                      }`}
                    >
                      <Clock className="size-3.5" />
                      <span>Pending Review</span>
                      {metrics.pendingCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[#ffaa00] text-[#0d1421] text-[10px] font-bold">
                          {metrics.pendingCount}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setWithdrawFilter("approved")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                        withdrawFilter === "approved"
                          ? "bg-[#09c48d]/20 text-[#09c48d] border border-[#09c48d]/30"
                          : "text-[#7b8c9f] hover:text-white"
                      }`}
                    >
                      <CheckCircle2 className="size-3.5" />
                      <span>Approved ({withdrawals.filter(w => w.status === "approved").length})</span>
                    </button>

                    <button
                      onClick={() => setWithdrawFilter("rejected")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                        withdrawFilter === "rejected"
                          ? "bg-[#ff5a63]/20 text-[#ff5a63] border border-[#ff5a63]/30"
                          : "text-[#7b8c9f] hover:text-white"
                      }`}
                    >
                      <XCircle className="size-3.5" />
                      <span>Rejected ({withdrawals.filter(w => w.status === "rejected").length})</span>
                    </button>

                    <button
                      onClick={() => setWithdrawFilter("all")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                        withdrawFilter === "all" ? "bg-[#162538] text-white" : "text-[#7b8c9f] hover:text-white"
                      }`}
                    >
                      All Requests ({withdrawals.length})
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#8aa0b6] font-mono">
                    <span className="size-2 rounded-full bg-[#09c48d] animate-pulse" />
                    <span>Realtime BEP20 Withdrawal Desk</span>
                  </div>
                </div>

                {/* Withdrawals Table */}
                <div className="rounded-2xl bg-[#0c1421] border border-[#162334] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#162334] bg-[#090f1a] text-[11px] font-semibold text-[#6b7b8f] uppercase tracking-wider">
                          <th className="py-3.5 px-4">Request ID</th>
                          <th className="py-3.5 px-4">Customer Details</th>
                          <th className="py-3.5 px-4">Amount</th>
                          <th className="py-3.5 px-4">Net Payout</th>
                          <th className="py-3.5 px-4">Network</th>
                          <th className="py-3.5 px-4">BEP20 Destination Address</th>
                          <th className="py-3.5 px-4">Submitted At</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4 text-right">Approve / Reject</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#131f2e] text-xs">
                        {filteredWithdrawals.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-16 text-center text-[#5a6a7c]">
                              <ArrowDownRight className="size-8 mx-auto mb-2 opacity-30" />
                              <div className="text-sm font-semibold text-[#8aa0b6]">
                                No {withdrawFilter !== "all" ? withdrawFilter : ""} Withdrawal Requests
                              </div>
                              <p className="text-xs text-[#5a6a7c] mt-1">
                                When a customer requests a withdrawal on the site, their BEP20 address and request will stream here live.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredWithdrawals.map((item) => {
                            const fee = item.amount * 0.02; // 2% fee
                            const net = Math.max(0, item.amount - fee);
                            return (
                              <tr key={item.id} className="hover:bg-[#0e1724] transition-colors">
                                {/* Request ID */}
                                <td className="py-3.5 px-4 font-mono text-[11px] text-[#8aa0b6]">
                                  #{item.id.slice(-6)}
                                </td>

                                {/* User */}
                                <td className="py-3.5 px-4">
                                  <div className="font-semibold text-white">{item.user_name}</div>
                                  <div className="text-[11px] text-[#6b7b8f] font-mono">{item.user_email}</div>
                                </td>

                                {/* Gross Amount */}
                                <td className="py-3.5 px-4 font-mono font-bold text-white text-sm">
                                  ${item.amount.toFixed(2)} USDT
                                </td>

                                {/* Net Payout */}
                                <td className="py-3.5 px-4 font-mono text-[#00d4ff] text-xs font-semibold">
                                  ${net.toFixed(2)} USDT
                                  <div className="text-[10px] text-[#6b7b8f]">Fee: -${fee.toFixed(2)}</div>
                                </td>

                                {/* Network */}
                                <td className="py-3.5 px-4">
                                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#09c48d]/10 text-[#09c48d] border border-[#09c48d]/30">
                                    {item.network || "USDT (BEP20)"}
                                  </span>
                                </td>

                                {/* BEP20 Address (Highlighted) */}
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-1.5 font-mono text-[12px] font-semibold text-[#eef2f6] bg-[#080e18] px-2.5 py-1.5 rounded-lg border border-[#172537] max-w-[220px]">
                                    <span className="truncate">{item.address}</span>
                                    <button
                                      onClick={() => copyToClipboard(item.address, item.id)}
                                      className="text-[#6b7b8f] hover:text-[#09c48d] shrink-0"
                                      title="Copy BEP20 address"
                                    >
                                      {copiedText === item.id ? (
                                        <Check className="size-3.5 text-[#09c48d]" />
                                      ) : (
                                        <Copy className="size-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </td>

                                {/* Submitted At */}
                                <td className="py-3.5 px-4 text-[#8aa0b6] font-mono text-[11px]">
                                  {new Date(item.created_at).toLocaleString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </td>

                                {/* Status */}
                                <td className="py-3.5 px-4">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                      item.status === "approved"
                                        ? "bg-[#09c48d]/15 text-[#09c48d] border border-[#09c48d]/30"
                                        : item.status === "pending"
                                        ? "bg-[#ffaa00]/15 text-[#ffaa00] border border-[#ffaa00]/30"
                                        : "bg-[#ff5a63]/15 text-[#ff5a63] border border-[#ff5a63]/30"
                                    }`}
                                  >
                                    <span
                                      className={`size-1.5 rounded-full ${
                                        item.status === "approved"
                                          ? "bg-[#09c48d]"
                                          : item.status === "pending"
                                          ? "bg-[#ffaa00] animate-ping"
                                          : "bg-[#ff5a63]"
                                      }`}
                                    />
                                    {item.status.toUpperCase()}
                                  </span>
                                  {item.reject_reason && (
                                    <p className="text-[10px] text-[#ff7078] max-w-xs mt-1 truncate" title={item.reject_reason}>
                                      Reason: {item.reject_reason}
                                    </p>
                                  )}
                                </td>

                                {/* Actions (Approve / Reject) */}
                                <td className="py-3.5 px-4 text-right">
                                  {item.status === "pending" ? (
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => setConfirmApproveId(item.id)}
                                        className="px-2.5 py-1 rounded-lg bg-[#09c48d] hover:bg-[#0bd69a] text-[#04140e] text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                      >
                                        <Check className="size-3.5 stroke-[2.5]" />
                                        <span>Approve</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          setRejectingWithdrawal(item);
                                          setRejectReason("");
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-[#ff5a63]/15 hover:bg-[#ff5a63]/25 text-[#ff5a63] text-xs font-semibold border border-[#ff5a63]/30 transition-all flex items-center gap-1"
                                      >
                                        <X className="size-3.5 stroke-[2.5]" />
                                        <span>Reject</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-[#5a6a7c] font-mono">
                                      {item.status === "approved" ? "Processed" : "Refunded"}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* VIEW 5: REFERRAL NETWORK */}
            {/* ============================================================== */}
            {activeTab === "referrals" && (
              <div className="space-y-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-[#0c1421] border border-[#162334]">
                    <div className="flex items-center justify-between text-[#8aa0b6] mb-2">
                      <span className="text-xs font-medium">Total Network Members</span>
                      <GitFork className="size-4 text-[#00d4ff]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">
                      {users.filter(u => u.referred_by).length}
                    </div>
                    <p className="text-[11px] text-[#6b7b8f] mt-1">Users recruited via referral links</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#0c1421] border border-[#162334]">
                    <div className="flex items-center justify-between text-[#8aa0b6] mb-2">
                      <span className="text-xs font-medium">Today's Recruits</span>
                      <Activity className="size-4 text-[#09c48d]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#09c48d]">
                      {users.filter(u => u.referred_by && u.created_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length}
                    </div>
                    <p className="text-[11px] text-[#6b7b8f] mt-1">Joined platform today</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#0c1421] border border-[#162334]">
                    <div className="flex items-center justify-between text-[#8aa0b6] mb-2">
                      <span className="text-xs font-medium">Active Referrer Leaders</span>
                      <Users className="size-4 text-[#ffaa00]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">
                      {referralNetwork.filter(r => r.members.length > 0).length}
                    </div>
                    <p className="text-[11px] text-[#6b7b8f] mt-1">Accounts with direct downlines</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#0c1421] border border-[#162334] overflow-hidden space-y-2">
                  <div className="p-4 border-b border-[#162334] flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white tracking-tight">
                        Referral Downlines & Tree Architecture
                      </h3>
                      <p className="text-xs text-[#6b7b8f]">
                        Click on any referrer to inspect their exact direct downline members and joining timestamps.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#162334] bg-[#090f1a] text-[11px] font-semibold text-[#6b7b8f] uppercase tracking-wider">
                          <th className="py-3 px-4">Referrer Account</th>
                          <th className="py-3 px-4">Invite Code</th>
                          <th className="py-3 px-4">Total Downline Members</th>
                          <th className="py-3 px-4">Today's New Members</th>
                          <th className="py-3 px-4">Direct Downline Volume</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#131f2e] text-xs">
                        {referralNetwork.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-16 text-center text-[#5a6a7c]">
                              <GitFork className="size-8 mx-auto mb-2 opacity-30" />
                              <div className="text-sm font-semibold text-[#8aa0b6]">No Referral Trees Established Yet</div>
                              <p className="text-xs text-[#5a6a7c] mt-1">
                                When users register with an invitation code, their parent sponsor and tree will appear here.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          referralNetwork.map(({ referrer, members, todayCount }) => {
                            const totalTeamVolume = members.reduce((sum, m) => sum + m.balance + m.total_deposit, 0);
                            return (
                              <tr key={referrer.id} className="hover:bg-[#0e1724] transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-lg bg-[#142337] text-[#09c48d] grid place-items-center font-bold text-xs uppercase shrink-0">
                                      {referrer.name.slice(0, 2)}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-white">{referrer.name}</div>
                                      <div className="text-[11px] text-[#6b7b8f] font-mono">{referrer.email}</div>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 font-mono font-semibold text-[#00d4ff]">
                                  {referrer.invite_code || "—"}
                                </td>

                                <td className="py-3.5 px-4">
                                  <span className="font-mono font-bold text-white text-sm">
                                    {members.length}
                                  </span>
                                  <span className="text-[11px] text-[#6b7b8f] ml-1">direct signups</span>
                                </td>

                                <td className="py-3.5 px-4">
                                  {todayCount > 0 ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#09c48d]/15 text-[#09c48d]">
                                      +{todayCount} today
                                    </span>
                                  ) : (
                                    <span className="text-[#6b7b8f] font-mono text-xs">0</span>
                                  )}
                                </td>

                                <td className="py-3.5 px-4 font-mono text-white">
                                  ${totalTeamVolume.toFixed(2)} USDT
                                </td>

                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    onClick={() => {
                                      setInspectTeamCode(referrer.invite_code || null);
                                      setInspectTeamName(referrer.name);
                                    }}
                                    disabled={members.length === 0}
                                    className="px-3 py-1 rounded-lg bg-[#142337] hover:bg-[#1b2f48] text-[#00d4ff] text-xs font-medium disabled:opacity-40 transition-colors"
                                  >
                                    View Members ({members.length})
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: USER DETAILS */}
      {/* ============================================================== */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
          <div className="w-full max-w-md rounded-2xl bg-[#0d1624] border border-[#1b2b3f] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#18283a]">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-[#09c48d]/10 text-[#09c48d] grid place-items-center font-bold text-sm">
                  {selectedUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedUser.name}</h3>
                  <p className="text-xs text-[#7b8c9f] font-mono">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-lg text-[#7b8c9f] hover:text-white hover:bg-[#142337]"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#080e18] border border-[#142131]">
                <span className="text-[#6b7b8f] block mb-1">Available Balance</span>
                <span className="text-base font-bold font-mono text-white">
                  ${selectedUser.balance.toFixed(2)} USDT
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#080e18] border border-[#142131]">
                <span className="text-[#6b7b8f] block mb-1">Frozen Trial Fund</span>
                <span className="text-base font-bold font-mono text-[#00d4ff]">
                  ${selectedUser.frozen_balance.toFixed(2)} USDT
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#080e18] border border-[#142131]">
                <span className="text-[#6b7b8f] block mb-1">Lifetime Deposits</span>
                <span className="text-sm font-bold font-mono text-[#09c48d]">
                  +${selectedUser.total_deposit.toFixed(2)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#080e18] border border-[#142131]">
                <span className="text-[#6b7b8f] block mb-1">Lifetime Withdrawals</span>
                <span className="text-sm font-bold font-mono text-[#ff5a63]">
                  -${selectedUser.total_withdraw.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs pt-1">
              <div className="flex justify-between py-1.5 border-b border-[#142131]">
                <span className="text-[#6b7b8f]">Unique Referral Code:</span>
                <span className="font-mono font-semibold text-white">{selectedUser.invite_code || "—"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#142131]">
                <span className="text-[#6b7b8f]">Referred By:</span>
                <span className="font-mono text-[#8aa0b6]">{selectedUser.referred_by || "Direct / System"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#142131]">
                <span className="text-[#6b7b8f]">Registered Timestamp:</span>
                <span className="font-mono text-[#8aa0b6]">{new Date(selectedUser.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#6b7b8f]">Account Status:</span>
                <span className={`font-semibold ${selectedUser.status === "active" ? "text-[#09c48d]" : "text-[#ff5a63]"}`}>
                  {selectedUser.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedUser(null)}
                className="w-full py-2.5 rounded-xl bg-[#142337] hover:bg-[#1a2e47] text-white text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADJUST USER BALANCE */}
      {/* ============================================================== */}
      {balanceAdjustUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
          <form
            onSubmit={handleAdjustBalanceSubmit}
            className="w-full max-w-md rounded-2xl bg-[#0d1624] border border-[#1b2b3f] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#18283a]">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-[#00d4ff]/10 text-[#00d4ff] grid place-items-center">
                  <DollarSign className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Manual Balance Adjustment</h3>
                  <p className="text-xs text-[#7b8c9f] truncate">{balanceAdjustUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBalanceAdjustUser(null)}
                className="p-1 rounded-lg text-[#7b8c9f] hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#080e18] border border-[#142131] flex justify-between items-center text-xs">
              <span className="text-[#7b8c9f]">Current Balance:</span>
              <span className="font-mono font-bold text-white text-sm">
                ${balanceAdjustUser.balance.toFixed(2)} USDT
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#080e18] border border-[#142131]">
              <button
                type="button"
                onClick={() => setAdjustType("credit")}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  adjustType === "credit"
                    ? "bg-[#09c48d] text-[#04140e] shadow-md font-bold"
                    : "text-[#7b8c9f] hover:text-white"
                }`}
              >
                <Plus className="size-3.5 stroke-[2.5]" />
                <span>Give Balance (Credit)</span>
              </button>

              <button
                type="button"
                onClick={() => setAdjustType("debit")}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  adjustType === "debit"
                    ? "bg-[#ff5a63] text-white shadow-md font-bold"
                    : "text-[#7b8c9f] hover:text-white"
                }`}
              >
                <Minus className="size-3.5 stroke-[2.5]" />
                <span>Deduct Balance</span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#c0cbd8]">
                  Amount (USDT)
                </label>
                <span className="text-[11px] text-[#09c48d] font-semibold">Quick Presets:</span>
              </div>
              <div className="grid grid-cols-6 gap-1.5 mb-2.5">
                {[10, 25, 50, 100, 500, 1000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAdjustAmount(String(val))}
                    className={`py-1 rounded-lg text-[11px] font-mono font-bold border transition-all ${
                      adjustAmount === String(val)
                        ? "bg-[#09c48d]/20 border-[#09c48d] text-[#09c48d]"
                        : "bg-[#080e18] border-[#172537] text-[#8aa0b6] hover:border-[#09c48d]/40 hover:text-white"
                    }`}
                  >
                    +${val}
                  </button>
                ))}
              </div>
              <input
                type="number"
                step="any"
                min="0.01"
                placeholder="Enter amount (e.g. 100.00)"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-xl bg-[#080e18] border border-[#172537] text-sm text-white font-mono placeholder-[#5a6a7c] focus:outline-none focus:border-[#09c48d]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#c0cbd8] mb-1.5">
                Audit Note / Reason
              </label>
              <input
                type="text"
                placeholder="e.g. Admin balance grant or deposit credit"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#080e18] border border-[#172537] text-xs text-white placeholder-[#5a6a7c] focus:outline-none focus:border-[#09c48d]"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBalanceAdjustUser(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#142337] hover:bg-[#1a2e47] text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                  adjustType === "credit"
                    ? "bg-[#09c48d] hover:bg-[#0bd69a] text-[#04140e]"
                    : "bg-[#ff5a63] hover:bg-[#ff6e76] text-white"
                }`}
              >
                {adjustType === "credit"
                  ? `Give $${adjustAmount ? parseFloat(adjustAmount).toFixed(2) : "0.00"} USDT`
                  : `Deduct $${adjustAmount ? parseFloat(adjustAmount).toFixed(2) : "0.00"} USDT`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: TEAM DOWNLINE MEMBERS */}
      {/* ============================================================== */}
      {inspectTeamCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
          <div className="w-full max-w-2xl rounded-2xl bg-[#0d1624] border border-[#1b2b3f] p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#18283a] shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">
                  Referral Downline for {inspectTeamName}
                </h3>
                <p className="text-xs text-[#7b8c9f] font-mono">
                  Referral Code: <span className="text-[#00d4ff] font-semibold">{inspectTeamCode}</span>
                </p>
              </div>
              <button
                onClick={() => setInspectTeamCode(null)}
                className="p-1 rounded-lg text-[#7b8c9f] hover:text-white hover:bg-[#142337]"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {downlineMembersForModal.length === 0 ? (
                <div className="py-12 text-center text-[#5a6a7c] text-xs">
                  No registered downlines under this code yet.
                </div>
              ) : (
                downlineMembersForModal.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#080e18] border border-[#142131]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-[#142337] text-[#09c48d] grid place-items-center font-bold text-xs">
                        {member.name.slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">{member.name}</div>
                        <div className="text-[11px] text-[#6b7b8f] font-mono">{member.email}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-white">
                        ${member.balance.toFixed(2)} USDT
                      </div>
                      <div className="text-[10px] text-[#6b7b8f] font-mono">
                        Joined: {new Date(member.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-[#18283a] shrink-0">
              <button
                onClick={() => setInspectTeamCode(null)}
                className="w-full py-2.5 rounded-xl bg-[#142337] hover:bg-[#1a2e47] text-white text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRM APPROVE WITHDRAWAL */}
      {/* ============================================================== */}
      {confirmApproveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
          <div className="w-full max-w-sm rounded-2xl bg-[#0d1624] border border-[#1b2b3f] p-6 shadow-2xl space-y-4 text-center">
            <div className="size-12 rounded-full bg-[#09c48d]/10 text-[#09c48d] grid place-items-center mx-auto">
              <Check className="size-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Approve BEP20 Withdrawal?</h3>
              <p className="text-xs text-[#7b8c9f] mt-1">
                This will mark withdrawal #{confirmApproveId.slice(-6)} as APPROVED and notify the customer on the exchange.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setConfirmApproveId(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#142337] hover:bg-[#1a2e47] text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApproveWithdrawal(confirmApproveId)}
                className="flex-1 py-2.5 rounded-xl bg-[#09c48d] hover:bg-[#0bd69a] text-[#04140e] text-xs font-bold transition-all shadow-lg shadow-[#09c48d]/20"
              >
                Yes, Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: REJECT WITHDRAWAL WITH REASON & REFUND */}
      {/* ============================================================== */}
      {rejectingWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
          <div className="w-full max-w-md rounded-2xl bg-[#0d1624] border border-[#1b2b3f] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#18283a]">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-[#ff5a63]/10 text-[#ff5a63] grid place-items-center">
                  <X className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Reject Withdrawal & Refund</h3>
                  <p className="text-xs text-[#7b8c9f]">#{rejectingWithdrawal.id.slice(-6)}</p>
                </div>
              </div>
              <button
                onClick={() => setRejectingWithdrawal(null)}
                className="p-1 rounded-lg text-[#7b8c9f] hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#291014]/60 border border-[#ff5a63]/30 text-xs text-[#ff8088] leading-relaxed">
              <span className="font-semibold block mb-0.5">Automatic Wallet Refund:</span>
              The requested amount of <strong>${rejectingWithdrawal.amount.toFixed(2)} USDT</strong> will be instantly refunded back to the user&apos;s wallet balance.
            </div>

            <div>
              <label className="block text-xs font-medium text-[#c0cbd8] mb-1.5">
                Reason for Rejection (Displayed to user)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Invalid BEP20 wallet address or unconfirmed account details..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#080e18] border border-[#172537] text-xs text-white placeholder-[#5a6a7c] focus:outline-none focus:border-[#ff5a63]"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setRejectingWithdrawal(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#142337] hover:bg-[#1a2e47] text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectWithdrawal}
                className="flex-1 py-2.5 rounded-xl bg-[#ff5a63] hover:bg-[#ff6e76] text-white text-xs font-bold transition-all shadow-lg shadow-[#ff5a63]/20"
              >
                Confirm Reject & Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRM APPROVE RECHARGE */}
      {/* ============================================================== */}
      {confirmApproveDepositId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
          <div className="w-full max-w-sm rounded-2xl bg-[#0d1624] border border-[#1b2b3f] p-6 shadow-2xl space-y-4 text-center">
            <div className="size-12 rounded-full bg-[#09c48d]/10 text-[#09c48d] grid place-items-center mx-auto">
              <Check className="size-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Approve Recharge?</h3>
              <p className="text-xs text-[#7b8c9f] mt-1">
                This will mark recharge #{confirmApproveDepositId.slice(-6)} as COMPLETED and automatically credit the user&apos;s available wallet balance.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setConfirmApproveDepositId(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#142337] hover:bg-[#1a2e47] text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApproveDeposit(confirmApproveDepositId)}
                className="flex-1 py-2.5 rounded-xl bg-[#09c48d] hover:bg-[#0bd69a] text-[#04140e] text-xs font-bold transition-all shadow-lg shadow-[#09c48d]/20"
              >
                Yes, Credit User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: REJECT RECHARGE */}
      {/* ============================================================== */}
      {rejectingDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
          <div className="w-full max-w-md rounded-2xl bg-[#0d1624] border border-[#1b2b3f] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#18283a]">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-[#ff5a63]/10 text-[#ff5a63] grid place-items-center">
                  <X className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Reject Recharge Request</h3>
                  <p className="text-xs text-[#7b8c9f]">#{rejectingDeposit.id.slice(-6)}</p>
                </div>
              </div>
              <button
                onClick={() => setRejectingDeposit(null)}
                className="p-1 rounded-lg text-[#7b8c9f] hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#c0cbd8] mb-1.5">
                Reason for Rejection
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Transaction hash not found on blockchain or incorrect deposit address..."
                value={depositRejectReason}
                onChange={(e) => setDepositRejectReason(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#080e18] border border-[#172537] text-xs text-white placeholder-[#5a6a7c] focus:outline-none focus:border-[#ff5a63]"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setRejectingDeposit(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#142337] hover:bg-[#1a2e47] text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectDeposit}
                className="flex-1 py-2.5 rounded-xl bg-[#ff5a63] hover:bg-[#ff6e76] text-white text-xs font-bold transition-all shadow-lg shadow-[#ff5a63]/20"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MOBILE DRAWER */}
      {/* ============================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-[#090f1a] border-r border-[#15202f] flex flex-col h-full z-10 p-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#15202f]">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-gradient-to-tr from-[#09c48d] to-[#00d4ff] grid place-items-center text-[#04140e] font-black text-sm">
                  V
                </div>
                <span className="text-sm font-bold text-white">VERTEX PRO</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-[#7b8c9f] hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1">
              <button
                onClick={() => {
                  setActiveTab("dashboard");
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  activeTab === "dashboard" ? "bg-[#111c2a] text-white" : "text-[#8796a8]"
                }`}
              >
                <LayoutDashboard className="size-4.5" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("users");
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium ${
                  activeTab === "users" ? "bg-[#111c2a] text-white" : "text-[#8796a8]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="size-4.5" />
                  <span>User Management</span>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#162334] text-[#8aa0b6]">
                  {metrics.totalUsers}
                </span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("deposits");
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium ${
                  activeTab === "deposits" ? "bg-[#111c2a] text-white" : "text-[#8796a8]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <ArrowUpRight className="size-4.5" />
                  <span>Recharge Requests</span>
                </div>
                {metrics.pendingDepositCount > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#09c48d] text-black">
                    {metrics.pendingDepositCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab("withdrawals");
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium ${
                  activeTab === "withdrawals" ? "bg-[#111c2a] text-white" : "text-[#8796a8]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <ArrowDownRight className="size-4.5" />
                  <span>Withdraw Requests</span>
                </div>
                {metrics.pendingCount > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#ff5a63] text-black">
                    {metrics.pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab("referrals");
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium ${
                  activeTab === "referrals" ? "bg-[#111c2a] text-white" : "text-[#8796a8]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <GitFork className="size-4.5" />
                  <span>Referral Network</span>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#162334] text-[#8aa0b6]">
                  {referralNetwork.length}
                </span>
              </button>
            </nav>

            <div className="pt-3 border-t border-[#15202f]">
              <Link
                to="/"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-medium text-white bg-[#142337]"
              >
                <ExternalLink className="size-3.5" />
                <span>Go to User App</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD NEW USER */}
      {/* ============================================================== */}
      {addUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
          <form
            onSubmit={handleCreateUser}
            className="w-full max-w-md rounded-2xl bg-[#0d1624] border border-[#1b2b3f] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#18283a]">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-[#09c48d]/10 text-[#09c48d] grid place-items-center">
                  <UserCheck className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Create New User Account</h3>
                  <p className="text-xs text-[#7b8c9f]">Register user and set initial balance</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddUserModalOpen(false)}
                className="p-1 rounded-lg text-[#7b8c9f] hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[#c0cbd8] mb-1">
                  Full Name <span className="text-[#ff5a63]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tanvir Ahmed"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-xl bg-[#080e18] border border-[#172537] text-white placeholder-[#5a6a7c] focus:outline-none focus:border-[#09c48d]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#c0cbd8] mb-1">
                  Email Address <span className="text-[#ff5a63]">*</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. user@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-xl bg-[#080e18] border border-[#172537] text-white placeholder-[#5a6a7c] focus:outline-none focus:border-[#09c48d]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#c0cbd8] mb-1">
                    Login Password
                  </label>
                  <input
                    type="text"
                    placeholder="123456"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#080e18] border border-[#172537] text-white placeholder-[#5a6a7c] focus:outline-none focus:border-[#09c48d]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#c0cbd8] mb-1">
                    Initial Balance (USDT)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={newUserBalance}
                    onChange={(e) => setNewUserBalance(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#080e18] border border-[#172537] text-white font-mono placeholder-[#5a6a7c] focus:outline-none focus:border-[#09c48d]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#c0cbd8] mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="+880..."
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#080e18] border border-[#172537] text-white placeholder-[#5a6a7c] focus:outline-none focus:border-[#09c48d]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#c0cbd8] mb-1">
                    Referral Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VTX8829"
                    value={newUserInviteCode}
                    onChange={(e) => setNewUserInviteCode(e.target.value.toUpperCase())}
                    className="w-full h-10 px-3 rounded-xl bg-[#080e18] border border-[#172537] text-white font-mono uppercase placeholder-[#5a6a7c] focus:outline-none focus:border-[#09c48d]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setAddUserModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#142337] hover:bg-[#1a2e47] text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingUser}
                className="flex-1 py-2.5 rounded-xl bg-[#09c48d] hover:bg-[#0bd69a] text-[#04140e] text-xs font-bold transition-all shadow-md disabled:opacity-50"
              >
                {isCreatingUser ? "Creating..." : "Create Account"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: SUPABASE SQL SETUP & FIX */}
      {/* ============================================================== */}
      {dbModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
          <div className="w-full max-w-lg rounded-2xl bg-[#0d1624] border border-[#1b2b3f] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#18283a]">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-[#00d4ff]/10 text-[#00d4ff] grid place-items-center">
                  <Activity className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Supabase Cloud Sync Status</h3>
                  <p className="text-xs text-[#7b8c9f]">bakbmhcoyaqsktzzglxr.supabase.co</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDbModalOpen(false)}
                className="p-1 rounded-lg text-[#7b8c9f] hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="text-xs text-[#c0cbd8] leading-relaxed">
              To allow registered users from all mobile devices and browsers to instantly appear with their real names and receive admin balance, run this 1-click command in your <strong>Supabase SQL Editor</strong>:
            </p>

            <div className="relative rounded-xl bg-[#060b13] border border-[#172537] p-3.5 font-mono text-[11px] text-[#34cc9b] leading-relaxed select-all">
              <pre className="whitespace-pre-wrap break-all">
{`ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits DISABLE ROW LEVEL SECURITY;`}
              </pre>
              <button
                type="button"
                onClick={() => {
                  copyToClipboard(
                    "ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;\nALTER TABLE public.withdrawals DISABLE ROW LEVEL SECURITY;\nALTER TABLE public.deposits DISABLE ROW LEVEL SECURITY;",
                    "sql_copy"
                  );
                  showNotification("SQL script copied to clipboard!");
                }}
                className="absolute top-2.5 right-2.5 px-2 py-1 rounded bg-[#142337] hover:bg-[#1f334e] text-white text-[10px] font-sans flex items-center gap-1"
              >
                {copiedText === "sql_copy" ? (
                  <>
                    <Check className="size-3 text-[#09c48d]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#09c48d]/10 border border-[#09c48d]/20 text-[11px] text-[#09c48d] leading-relaxed">
              ✓ Once executed, any customer signing up on any device will immediately show up in the User Management desk with their Full Name, Email, and Balance.
            </div>

            <button
              type="button"
              onClick={() => setDbModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[#142337] hover:bg-[#1a2e47] text-white text-xs font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
