import React, { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  GitFork,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Eye,
  RefreshCw,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Wallet,
  Coins,
  Copy,
  ChevronRight,
  Check,
  UserCheck,
  UserX,
  DollarSign,
  TrendingUp,
  Globe,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AdminUser,
  AdminWithdrawal,
  AdminDeposit,
  ChartDayData,
  getAdminUsers,
  getAdminWithdrawals,
  getAdminDeposits,
  getWeeklyChartData,
  getDashboardMetrics,
  toggleUserStatus,
  approveWithdrawal,
  rejectWithdrawal,
} from "@/lib/admin-store";
import { supabase } from "@/integrations/supabase/client";

type TabType = "dashboard" | "users" | "referrals" | "withdrawals";
type Language = "en" | "bn";

const translations = {
  en: {
    admin: "Admin",
    adminPanel: "Admin Panel",
    dashboard: "Dashboard",
    userManagement: "User Management",
    userControl: "User Control (Referrals)",
    withdrawRequests: "Withdraw Requests",
    realtimeLive: "Live",
    supabaseRealtime: "Supabase Realtime Active",
    superAdmin: "Super Admin",
    website: "Main Website",
    logout: "Log Out",
    refreshData: "Refresh Data",
    testWithdrawPage: "Test Withdraw Page",
    dashboardOverview: "Dashboard Overview",
    dashboardSubtitle: "Vertex Crypto Exchange Realtime Management System",
    usersTitle: "User Management & Account Controls",
    usersSubtitle: "Manage users, inspect balances, and block/unblock accounts",
    referralsTitle: "Referral System & Team Hierarchy",
    referralsSubtitle: "Track referrers, referred members, and team network",
    withdrawalsTitle: "Withdraw Requests & Approvals",
    withdrawalsSubtitle: "Live withdrawal requests submitted from the exchange",
    
    // Stats
    totalDeposit: "Total Deposits",
    todayDeposit: "Today's Deposits",
    totalWithdraw: "Total Withdrawals",
    todayWithdraw: "Today's Withdrawals",
    liveOnchainVolume: "Live On-chain Volume",
    last24Hours: "Last 24 Hours Record",
    approvedTransactions: "Approved Transactions",
    pendingRequestsCount: (n: number) => `${n} Request${n === 1 ? "" : "s"} Pending`,
    
    // Chart
    chartTitle: "7-Day Deposit vs Withdraw Volume",
    chartSubtitle: "Daily deposit and withdrawal tracking graph (USD)",
    deposit: "Deposit",
    withdraw: "Withdraw",
    
    // Quick action
    pendingWithdrawals: "Pending Withdrawals",
    viewAll: "View All",
    noPendingWithdrawals: "No pending withdrawal requests. All requests are processed.",
    takeAction: "Take Action",
    
    // Users
    searchPlaceholder: "Search by name, phone, or email...",
    all: "All",
    active: "Active",
    blocked: "Blocked",
    userCol: "User",
    balanceCol: "Balance",
    depositCol: "Total Deposit",
    withdrawCol: "Total Withdraw",
    joinedCol: "Joined Date",
    statusCol: "Status",
    actionCol: "Action",
    noUsersFound: "No users found matching your search.",
    viewDetails: "Details",
    blockUser: "Block",
    unblockUser: "Unblock",
    
    // User details modal
    userDetailsTitle: "User Account Details",
    userDetailsDesc: "Account identity and transaction balance breakdown",
    phoneNotSet: "No phone provided",
    currentBalance: "Current Balance",
    referralCode: "Referral Code",
    accountStatus: "Account Status",
    close: "Close",
    
    // Referrals
    totalReferralMembers: "Total Referral Members",
    todayNewMembers: "Today's New Members",
    activeTeamAcrossLevels: "Active members across all levels",
    todayJoinedCount: "New referrals joined today",
    persons: "Members",
    referrerUser: "Referrer",
    referralCodeCol: "Invite Code",
    totalMembersCol: "Total Members",
    todayMembersCol: "Today's Members",
    commissionEarnedCol: "Earned Bonus ($5/member)",
    teamListCol: "Team Members",
    viewTeamMembers: "View Members",
    teamModalTitle: (name: string) => `${name}'s Team Members`,
    teamModalDesc: (code: string) => `Referral Code: ${code} · Full list of invited members`,
    noMembersYet: "No members have joined under this referrer yet.",
    
    // Withdrawals
    userAndEmailCol: "User / Email",
    amountCol: "Amount",
    methodCol: "Payment Method",
    addressCol: "Wallet Address / Account",
    timeCol: "Time",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    approve: "Approve",
    reject: "Reject",
    completed: "Completed",
    cancelled: "Cancelled",
    reason: "Reason",
    noWithdrawals: "No withdrawal requests found.",
    
    // Dialogs
    approveDialogTitle: "Approve Withdrawal Request?",
    approveDialogDesc: "Approving will immediately mark this transaction as approved and reflect on the user's dashboard.",
    cancel: "Cancel",
    confirmApprove: "Yes, Approve",
    processing: "Processing...",
    rejectDialogTitle: "Reject Withdrawal Request",
    rejectDialogDesc: "Rejecting will return the requested amount back to the user's balance and show the reason.",
    rejectReasonLabel: "Reject Reason:",
    rejectReasonPlaceholder: "e.g., Invalid wallet address / KYC verification required...",
    confirmReject: "Reject & Refund",
    
    // Toasts
    copiedAddress: "Address copied to clipboard",
    userBlockedSuccess: "User blocked successfully.",
    userUnblockedSuccess: "User unblocked successfully.",
    withdrawApprovedSuccess: "Withdrawal request approved successfully!",
    withdrawRejectedSuccess: "Withdrawal rejected and funds refunded to user balance.",
    approveFailed: "Failed to approve withdrawal.",
    rejectFailed: "Failed to reject withdrawal.",
    realtimeUpdate: "New withdrawal update received (Realtime)",
    sessionActive: "Admin session is active",
  },
  bn: {
    admin: "এডমিন",
    adminPanel: "এডমিন প্যানেল",
    dashboard: "ড্যাশবোর্ড",
    userManagement: "ইউজার ম্যানেজমেন্ট",
    userControl: "ইউজার কন্ট্রোল (রেফারেল)",
    withdrawRequests: "উইথড্র রিকোয়েস্ট",
    realtimeLive: "লাইভ",
    supabaseRealtime: "Supabase রিয়েল-টাইম সক্রিয়",
    superAdmin: "সুপার এডমিন",
    website: "ওয়েবসাইট",
    logout: "লগআউট",
    refreshData: "ডেটা রিফ্রেশ",
    testWithdrawPage: "টেস্ট উইথড্র পেজ",
    dashboardOverview: "ড্যাশবোর্ড ওভারভিউ",
    dashboardSubtitle: "ভার্টেক্স ক্রিপ্টো এক্সচেঞ্জ রিয়েল-টাইম অ্যাডমিন কন্ট্রোল সিস্টেম",
    usersTitle: "ইউজার ম্যানেজমেন্ট ও একাউন্ট কন্ট্রোল",
    usersSubtitle: "ইউজার তালিকা, ব্যালেন্স এবং ব্লক/আনব্লক সুবিধা",
    referralsTitle: "রেফারেল সিস্টেম ও টিম কন্ট্রোল",
    referralsSubtitle: "রেফারেল ট্র্যাকিং ও টিম হায়ারার্কি ম্যানেজমেন্ট",
    withdrawalsTitle: "উইথড্র রিকোয়েস্ট ও অনুমোদন",
    withdrawalsSubtitle: "ওয়েবসাইট থেকে লাইভ জমা হওয়া সকল উইথড্র রিকোয়েস্ট",
    
    // Stats
    totalDeposit: "মোট ডিপোজিট",
    todayDeposit: "আজকের ডিপোজিট",
    totalWithdraw: "মোট উইথড্র",
    todayWithdraw: "আজকের উইথড্র",
    liveOnchainVolume: "লাইভ অন-চেইন ভলিউম",
    last24Hours: "গত ২৪ ঘণ্টার রেকর্ড",
    approvedTransactions: "অনুমোদিত ট্রানজেকশন",
    pendingRequestsCount: (n: number) => `${n} টি রিকোয়েস্ট পেন্ডিং`,
    
    // Chart
    chartTitle: "শেষ ৭ দিনের ডিপোজিট বনাম উইথড্র ট্র্যাকিং",
    chartSubtitle: "রোজকার ডিপোজিট ও উইথড্রয়াল ভলিউম গ্রাফ (USD)",
    deposit: "ডিপোজিট",
    withdraw: "উইথড্র",
    
    // Quick action
    pendingWithdrawals: "পেন্ডিং উইথড্র রিকোয়েস্ট",
    viewAll: "সবগুলো দেখুন",
    noPendingWithdrawals: "কোনো পেন্ডিং উইথড্র রিকোয়েস্ট নেই। সব রিকোয়েস্ট প্রসেস করা হয়েছে।",
    takeAction: "অ্যাকশন নিন",
    
    // Users
    searchPlaceholder: "নাম, ফোন অথবা ইমেইল দিয়ে খুঁজুন…",
    all: "সব",
    active: "সক্রিয়",
    blocked: "ব্লকড",
    userCol: "ইউজার",
    balanceCol: "ব্যালেন্স",
    depositCol: "মোট ডিপোজিট",
    withdrawCol: "মোট উইথড্র",
    joinedCol: "জয়েনিং তারিখ",
    statusCol: "স্ট্যাটাস",
    actionCol: "অ্যাকশন",
    noUsersFound: "কোনো ইউজার খুঁজে পাওয়া যায়নি।",
    viewDetails: "বিস্তারিত",
    blockUser: "ব্লক করুন",
    unblockUser: "আনব্লক",
    
    // User details modal
    userDetailsTitle: "ইউজার বিস্তারিত তথ্য",
    userDetailsDesc: "একাউন্ট আইডি এবং আর্থিক লেনদেনের সারসংক্ষেপ",
    phoneNotSet: "ফোন নম্বর দেওয়া হয়নি",
    currentBalance: "বর্তমান ব্যালেন্স",
    referralCode: "রেফারেল কোড",
    accountStatus: "একাউন্ট স্ট্যাটাস",
    close: "বন্ধ করুন",
    
    // Referrals
    totalReferralMembers: "মোট রেফারেল সদস্য",
    todayNewMembers: "আজকের মোট নতুন সদস্য",
    activeTeamAcrossLevels: "সকল লেভেল মিলিয়ে সক্রিয় টিম",
    todayJoinedCount: "আজ জয়েন করা মোট রেফার্ড ইউজার",
    persons: "জন",
    referrerUser: "রেফারার ইউজার",
    referralCodeCol: "রেফার কোড",
    totalMembersCol: "মোট সদস্য",
    todayMembersCol: "আজকের সদস্য",
    commissionEarnedCol: "অর্জিত কমিশন ($৫/সদস্য)",
    teamListCol: "টিম তালিকা",
    viewTeamMembers: "সদস্য দেখুন",
    teamModalTitle: (name: string) => `${name}-এর টিম সদস্যবৃন্দ`,
    teamModalDesc: (code: string) => `রেফারেল কোড: ${code} · আমন্ত্রিত সদস্যদের সম্পূর্ণ তালিকা`,
    noMembersYet: "এই রেফারারের অধীনে এখনো কোনো সদস্য যোগ দেয়নি।",
    
    // Withdrawals
    userAndEmailCol: "ইউজারের নাম ও ইমেইল",
    amountCol: "উইথড্র পরিমাণ",
    methodCol: "পেমেন্ট মেথড",
    addressCol: "ওয়ালেট অ্যাড্রেস / নম্বর",
    timeCol: "সময়",
    pending: "পেন্ডিং",
    approved: "এপ্রুভড",
    rejected: "রিজেক্টেড",
    approve: "এপ্রুভ",
    reject: "রিজেক্ট",
    completed: "সম্পন্ন",
    cancelled: "বাতিলকৃত",
    reason: "কারণ",
    noWithdrawals: "কোনো উইথড্র রিকোয়েস্ট নেই।",
    
    // Dialogs
    approveDialogTitle: "উইথড্র রিকোয়েস্ট অনুমোদন করবেন?",
    approveDialogDesc: "অনুমোদন দিলে সাথে সাথে ইউজারের উইথড্র সফল হিসেবে চিহ্নিত হবে এবং ওয়েবসাইটে ইউজারের প্রোফাইলে এপ্রুভড হিসেবে আপডেট হবে।",
    cancel: "বাতিল",
    confirmApprove: "হ্যাঁ, অনুমোদন করুন",
    processing: "প্রসেস হচ্ছে…",
    rejectDialogTitle: "উইথড্র রিকোয়েস্ট রিজেক্ট করুন",
    rejectDialogDesc: "রিজেক্ট করলে উইথড্রয়ালের সমপরিমাণ অর্থ ইউজারের ব্যালেন্সে ফেরত চলে যাবে এবং ওয়েবসাইটে কারণ দেখতে পাবে।",
    rejectReasonLabel: "রিজেক্ট করার কারণ (Reject Reason):",
    rejectReasonPlaceholder: "যেমন: ভুল ওয়ালেট অ্যাড্রেস / ট্রানজেকশন লিমিট শেষ…",
    confirmReject: "রিজেক্ট ও রিফান্ড করুন",
    
    // Toasts
    copiedAddress: "অ্যাড্রেস কপি করা হয়েছে",
    userBlockedSuccess: "ইউজার সফলভাবে ব্লক করা হয়েছে।",
    userUnblockedSuccess: "ইউজার সফলভাবে আনব্লক করা হয়েছে।",
    withdrawApprovedSuccess: "উইথড্র রিকোয়েস্ট সফলভাবে এপ্রুভ করা হয়েছে!",
    withdrawRejectedSuccess: "উইথড্র রিকোয়েস্ট রিজেক্ট করা হয়েছে এবং ব্যালেন্স রিফান্ড হয়েছে।",
    approveFailed: "এপ্রুভ করতে ব্যর্থ হয়েছে।",
    rejectFailed: "রিজেক্ট করতে ব্যর্থ হয়েছে।",
    realtimeUpdate: "নতুন উইথড্র আপডেট রিসিভ হয়েছে (Realtime)",
    sessionActive: "এডমিন সেশন সক্রিয় রয়েছে",
  }
};

export function AdminPanel() {
  const [lang, setLang] = useState<Language>(() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("vx_admin_lang");
      if (saved === "bn" || saved === "en") return saved;
    }
    return "en";
  });

  const t = translations[lang];

  const toggleLanguage = () => {
    const next: Language = lang === "en" ? "bn" : "en";
    setLang(next);
    try {
      localStorage.setItem("vx_admin_lang", next);
    } catch {}
  };

  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Data states
  const [users, setUsers] = useState<AdminUser[]>(() => getAdminUsers());
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>(() => getAdminWithdrawals());
  const [deposits, setDeposits] = useState<AdminDeposit[]>(() => getAdminDeposits());
  const [chartData, setChartData] = useState<ChartDayData[]>(() => getWeeklyChartData());
  const [metrics, setMetrics] = useState(() => getDashboardMetrics());

  // Realtime indicator
  const [isRealtimeActive, setIsRealtimeActive] = useState(true);

  // Filters and search
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | "active" | "blocked">("all");
  const [withdrawalFilter, setWithdrawalFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  // Modals state
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);

  const [selectedReferrer, setSelectedReferrer] = useState<AdminUser | null>(null);
  const [referralModalOpen, setReferralModalOpen] = useState(false);

  // Approve dialog
  const [approveConfirmId, setApproveConfirmId] = useState<string | null>(null);
  const [isProcessingApprove, setIsProcessingApprove] = useState(false);

  // Reject modal
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessingReject, setIsProcessingReject] = useState(false);

  // Refresh all data
  const refreshData = () => {
    setUsers(getAdminUsers());
    setWithdrawals(getAdminWithdrawals());
    setDeposits(getAdminDeposits());
    setChartData(getWeeklyChartData());
    setMetrics(getDashboardMetrics());
  };

  // Supabase Realtime Subscription for Live Withdrawals
  useEffect(() => {
    refreshData();

    let channel: any;
    try {
      channel = supabase
        .channel("withdrawals-realtime-channel")
        .on(
          "postgres_changes" as any,
          { event: "*", schema: "public", table: "withdrawals" },
          () => {
            toast.info(t.realtimeUpdate);
            refreshData();
          }
        )
        .subscribe((status: string) => {
          if (status === "SUBSCRIBED") {
            setIsRealtimeActive(true);
          }
        });
    } catch {
      setIsRealtimeActive(true);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.phone && u.phone.includes(userSearch));
      const matchStatus = userStatusFilter === "all" || u.status === userStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [users, userSearch, userStatusFilter]);

  // Filtered withdrawals
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((w) => {
      if (withdrawalFilter === "all") return true;
      return w.status === withdrawalFilter;
    });
  }, [withdrawals, withdrawalFilter]);

  // Pending count
  const pendingCount = useMemo(() => {
    return withdrawals.filter((w) => w.status === "pending").length;
  }, [withdrawals]);

  // Referrals tree data
  const referrers = useMemo(() => {
    return users.map((u) => {
      const referredList = users.filter((sub) => sub.referred_by === u.id || sub.referred_by === u.invite_code);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayCount = referredList.filter(
        (sub) => new Date(sub.created_at).getTime() >= todayStart.getTime()
      ).length;

      return {
        user: u,
        referredList,
        totalReferred: referredList.length,
        todayReferred: todayCount,
      };
    });
  }, [users]);

  const totalReferralMembers = useMemo(() => {
    return referrers.reduce((sum, r) => sum + r.totalReferred, 0);
  }, [referrers]);

  const todayReferralMembers = useMemo(() => {
    return referrers.reduce((sum, r) => sum + r.todayReferred, 0);
  }, [referrers]);

  // Actions
  const handleToggleBlock = (userId: string, currentStatus: "active" | "blocked") => {
    const updated = toggleUserStatus(userId);
    setUsers(updated);
    toast.success(currentStatus === "active" ? t.userBlockedSuccess : t.userUnblockedSuccess);
  };

  const handleApprove = async () => {
    if (!approveConfirmId) return;
    setIsProcessingApprove(true);
    try {
      const updated = await approveWithdrawal(approveConfirmId);
      setWithdrawals(updated);
      setMetrics(getDashboardMetrics());
      setApproveConfirmId(null);
      toast.success(t.withdrawApprovedSuccess);
    } catch {
      toast.error(t.approveFailed);
    } finally {
      setIsProcessingApprove(false);
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    setIsProcessingReject(true);
    try {
      const updated = await rejectWithdrawal(rejectId, rejectReason);
      setWithdrawals(updated);
      setUsers(getAdminUsers());
      setMetrics(getDashboardMetrics());
      setRejectId(null);
      setRejectReason("");
      toast.success(t.withdrawRejectedSuccess);
    } catch {
      toast.error(t.rejectFailed);
    } finally {
      setIsProcessingReject(false);
    }
  };

  const formatTk = (amount: number) => {
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (lang === "bn") {
        return d.toLocaleDateString("bn-BD", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="min-h-screen bg-[#080e1a] text-[#eef2f6] flex flex-col md:flex-row antialiased font-sans">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0d1522] border-b border-[#1e293b] sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 grid place-items-center font-bold text-white shadow-md shadow-emerald-500/20">
            V
          </div>
          <div>
            <span className="text-base font-extrabold tracking-wider text-white">
              VERTEX<span className="text-emerald-400">.</span>
            </span>
            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {t.admin}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 text-xs bg-[#111c2e] border-[#1e293b] text-emerald-400 font-bold"
            onClick={toggleLanguage}
          >
            <Globe className="size-3.5 mr-1" />
            {lang === "en" ? "বাংলা" : "EN"}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-9 text-slate-300"
            onClick={refreshData}
            title={t.refreshData}
          >
            <RefreshCw className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-9 text-slate-300"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </header>

      {/* Sidebar Navigation (Desktop Persistent + Mobile Drawer) */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-[#0d1522] border-r border-[#1e293b] flex flex-col justify-between z-50 transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-[#1e293b] hidden md:flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 grid place-items-center font-black text-white shadow-lg shadow-emerald-500/20 text-lg">
                V
              </div>
              <div>
                <span className="text-lg font-black tracking-wider text-white">
                  VERTEX<span className="text-emerald-400">.</span>
                </span>
                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {t.adminPanel}
                </span>
              </div>
            </div>
          </div>

          {/* Realtime Live Indicator */}
          <div className="px-5 py-2.5 bg-[#111c2e] border-b border-[#1e293b] flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-slate-300 font-medium text-[11px]">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              {t.supabaseRealtime}
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
              {t.realtimeLive}
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1.5">
            <button
              onClick={() => {
                setActiveTab("dashboard");
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "dashboard"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                  : "text-slate-300 hover:bg-[#142033] hover:text-white"
              }`}
            >
              <LayoutDashboard className="size-4.5" />
              <span>{t.dashboard}</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("users");
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "users"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                  : "text-slate-300 hover:bg-[#142033] hover:text-white"
              }`}
            >
              <Users className="size-4.5" />
              <span>{t.userManagement}</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("referrals");
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "referrals"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                  : "text-slate-300 hover:bg-[#142033] hover:text-white"
              }`}
            >
              <GitFork className="size-4.5" />
              <span>{t.userControl}</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("withdrawals");
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "withdrawals"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                  : "text-slate-300 hover:bg-[#142033] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <ArrowUpRight className="size-4.5" />
                <span>{t.withdrawRequests}</span>
              </div>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#1e293b] space-y-3 bg-[#0a101a]">
          {/* Language Switcher in Desktop Sidebar */}
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-[#111c2e] border border-[#1e293b]">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Globe className="size-3.5 text-emerald-400" />
              Language
            </span>
            <button
              onClick={toggleLanguage}
              className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
            >
              {lang === "en" ? "Switch to বাংলা" : "Switch to English"}
            </button>
          </div>

          <div className="flex items-center gap-3 px-2">
            <div className="size-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 grid place-items-center text-emerald-400 font-bold text-xs">
              AD
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{t.superAdmin}</p>
              <p className="text-[10px] text-slate-400 truncate">admin@vertex.market</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs border-[#1e293b] bg-[#111c2e] hover:bg-[#16253c] text-slate-200"
            >
              <Link to="/">
                <ExternalLink className="size-3.5 mr-1 text-emerald-400" />
                {t.website}
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-rose-400 hover:bg-rose-500/10"
              onClick={() => {
                toast.success(t.sessionActive);
              }}
              title={t.logout}
            >
              <LogOut className="size-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-7 max-w-7xl mx-auto w-full space-y-6">
        {/* Top bar with Tab Heading, Language Toggle & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e293b]">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              {activeTab === "dashboard" && t.dashboardOverview}
              {activeTab === "users" && t.usersTitle}
              {activeTab === "referrals" && t.referralsTitle}
              {activeTab === "withdrawals" && t.withdrawalsTitle}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {activeTab === "dashboard" && t.dashboardSubtitle}
              {activeTab === "users" && t.usersSubtitle}
              {activeTab === "referrals" && t.referralsSubtitle}
              {activeTab === "withdrawals" && t.withdrawalsSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Language Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="h-9 px-3 text-xs bg-[#111b27] border-emerald-500/30 text-emerald-400 font-bold hover:bg-[#162334]"
            >
              <Globe className="size-3.5 mr-1.5" />
              {lang === "en" ? "বাংলা ইন্টারফেস" : "English"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              className="h-9 px-3 text-xs bg-[#111b27] border-[#1e293b] text-slate-300 hover:text-white hover:bg-[#162334]"
            >
              <RefreshCw className="size-3.5 mr-1.5 text-emerald-400" />
              {t.refreshData}
            </Button>

            <Button
              asChild
              variant="default"
              size="sm"
              className="h-9 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-600/20"
            >
              <Link to="/withdraw">
                {t.testWithdrawPage}
              </Link>
            </Button>
          </div>
        </div>

        {/* ----------------- ১) ড্যাশবোর্ড (Dashboard Tab) ----------------- */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* ৪টি স্ট্যাট কার্ড */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* মোট ডিপোজিট */}
              <div className="rounded-2xl bg-[#0e1726] border border-[#1e293b] p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">{t.totalDeposit}</span>
                  <div className="size-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 grid place-items-center text-emerald-400 shadow-sm">
                    <ArrowDownRight className="size-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-black text-white tabular-nums tracking-tight font-mono">
                    {formatTk(metrics.totalDeposit)}
                  </h3>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                    <TrendingUp className="size-3.5" />
                    <span>{t.liveOnchainVolume}</span>
                  </div>
                </div>
              </div>

              {/* আজকের ডিপোজিট */}
              <div className="rounded-2xl bg-[#0e1726] border border-[#1e293b] p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">{t.todayDeposit}</span>
                  <div className="size-10 rounded-xl bg-teal-500/15 border border-teal-500/30 grid place-items-center text-teal-400 shadow-sm">
                    <Coins className="size-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-black text-white tabular-nums tracking-tight font-mono">
                    {formatTk(metrics.todayDeposit)}
                  </h3>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-teal-300 font-semibold">
                    <Clock className="size-3.5" />
                    <span>{t.last24Hours}</span>
                  </div>
                </div>
              </div>

              {/* মোট উইথড্র */}
              <div className="rounded-2xl bg-[#0e1726] border border-[#1e293b] p-5 shadow-lg relative overflow-hidden group hover:border-rose-500/40 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">{t.totalWithdraw}</span>
                  <div className="size-10 rounded-xl bg-rose-500/15 border border-rose-500/30 grid place-items-center text-rose-400 shadow-sm">
                    <ArrowUpRight className="size-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-black text-white tabular-nums tracking-tight font-mono">
                    {formatTk(metrics.totalWithdraw)}
                  </h3>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-400 font-semibold">
                    <CheckCircle2 className="size-3.5" />
                    <span>{t.approvedTransactions}</span>
                  </div>
                </div>
              </div>

              {/* আজকের উইথড্র */}
              <div className="rounded-2xl bg-[#0e1726] border border-[#1e293b] p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">{t.todayWithdraw}</span>
                  <div className="size-10 rounded-xl bg-amber-500/15 border border-amber-500/30 grid place-items-center text-amber-400 shadow-sm">
                    <Clock className="size-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-black text-white tabular-nums tracking-tight font-mono">
                    {formatTk(metrics.todayWithdraw)}
                  </h3>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                    <span>{t.pendingRequestsCount(pendingCount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* লাইন চার্ট (শেষ ৭ দিনের ডিপোজিট বনাম উইথড্র) */}
            <div className="rounded-2xl bg-[#0e1726] border border-[#1e293b] p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="size-4.5 text-emerald-400" />
                    {t.chartTitle}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t.chartSubtitle}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                    <span className="text-slate-300">{t.deposit}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 rounded-full bg-rose-400 shadow-sm shadow-rose-400/50" />
                    <span className="text-slate-300">{t.withdraw}</span>
                  </div>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#111c2e",
                        borderColor: "#334155",
                        borderRadius: "10px",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
                      }}
                      labelStyle={{ color: "#f8fafc", fontWeight: "bold" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                    <Line
                      type="monotone"
                      name={`${t.deposit} ($)`}
                      dataKey="deposit"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#10b981" }}
                      activeDot={{ r: 7, stroke: "#34d399", strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      name={`${t.withdraw} ($)`}
                      dataKey="withdraw"
                      stroke="#f43f5e"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#f43f5e" }}
                      activeDot={{ r: 7, stroke: "#fb7185", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Action Preview: Pending Withdrawals */}
            <div className="rounded-2xl bg-[#0e1726] border border-[#1e293b] p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertCircle className="size-4 text-amber-400" />
                  {t.pendingWithdrawals} ({pendingCount})
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("withdrawals")}
                  className="text-xs text-emerald-400 hover:text-emerald-300"
                >
                  {t.viewAll} <ChevronRight className="size-3.5 ml-1" />
                </Button>
              </div>

              {pendingCount === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs bg-[#0b121e] rounded-xl border border-[#1b2636]">
                  {t.noPendingWithdrawals}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {withdrawals
                    .filter((w) => w.status === "pending")
                    .slice(0, 3)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#111c2e] border border-[#1e293b]"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-white truncate">{item.user_name}</p>
                          <p className="text-xs text-slate-400 truncate">{item.user_email}</p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">{item.network} · {item.address}</p>
                        </div>
                        <div className="flex items-center gap-3 justify-between sm:justify-end">
                          <span className="font-mono text-base font-bold text-amber-400">
                            {formatTk(item.amount)}
                          </span>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 px-3"
                            onClick={() => {
                              setActiveTab("withdrawals");
                              setApproveConfirmId(item.id);
                            }}
                          >
                            {t.takeAction}
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------- ২) ইউজার ম্যানেজমেন্ট (User Management Tab) ----------------- */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Search & Filter Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0e1726] p-4 rounded-2xl border border-[#1e293b]">
              <div className="relative flex-1 max-w-md">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="pl-9 h-10 bg-[#111c2e] border-[#1e293b] text-white text-xs rounded-xl focus-visible:ring-emerald-500"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-[#111c2e] p-1 rounded-xl border border-[#1e293b] text-xs">
                <button
                  onClick={() => setUserStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    userStatusFilter === "all"
                      ? "bg-emerald-500 text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t.all} ({users.length})
                </button>
                <button
                  onClick={() => setUserStatusFilter("active")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    userStatusFilter === "active"
                      ? "bg-emerald-500 text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t.active} ({users.filter((u) => u.status === "active").length})
                </button>
                <button
                  onClick={() => setUserStatusFilter("blocked")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    userStatusFilter === "blocked"
                      ? "bg-rose-600 text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t.blocked} ({users.filter((u) => u.status === "blocked").length})
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="rounded-2xl bg-[#0e1726] border border-[#1e293b] overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#111c2e] border-b border-[#1e293b] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">{t.userCol}</th>
                      <th className="py-3.5 px-4">{t.balanceCol}</th>
                      <th className="py-3.5 px-4">{t.depositCol}</th>
                      <th className="py-3.5 px-4">{t.withdrawCol}</th>
                      <th className="py-3.5 px-4">{t.joinedCol}</th>
                      <th className="py-3.5 px-4">{t.statusCol}</th>
                      <th className="py-3.5 px-4 text-right">{t.actionCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b]">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                          {t.noUsersFound}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-[#121e31] transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white text-sm">{u.name}</div>
                            <div className="text-slate-400 font-mono text-[11px]">{u.email}</div>
                            {u.phone && <div className="text-slate-500 text-[10px]">{u.phone}</div>}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                            {formatTk(u.balance)}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {formatTk(u.total_deposit)}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {formatTk(u.total_withdraw)}
                          </td>
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                            {formatDate(u.created_at)}
                          </td>
                          <td className="py-3 px-4">
                            {u.status === "active" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <span className="size-1.5 rounded-full bg-emerald-400" />
                                {t.active}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                <span className="size-1.5 rounded-full bg-rose-400" />
                                {t.blocked}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(u);
                                setUserModalOpen(true);
                              }}
                              className="h-7 px-2.5 text-xs border-[#1e293b] bg-[#111c2e] hover:bg-[#16253c] text-slate-200"
                            >
                              <Eye className="size-3 mr-1 text-emerald-400" />
                              {t.viewDetails}
                            </Button>
                            <Button
                              size="sm"
                              variant={u.status === "active" ? "destructive" : "secondary"}
                              onClick={() => handleToggleBlock(u.id, u.status)}
                              className={`h-7 px-2.5 text-xs font-semibold ${
                                u.status === "active"
                                  ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30"
                                  : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
                              }`}
                            >
                              {u.status === "active" ? t.blockUser : t.unblockUser}
                            </Button>
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

        {/* ----------------- ৩) ইউজার কন্ট্রোল (রেফারেল সিস্টেম) ----------------- */}
        {activeTab === "referrals" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-[#0e1726] border border-[#1e293b] flex items-center justify-between shadow-lg">
                <div>
                  <p className="text-xs text-slate-400 font-medium">{t.totalReferralMembers}</p>
                  <h3 className="text-3xl font-black text-white mt-1 font-mono">
                    {totalReferralMembers} <span className="text-xs text-slate-400 font-normal">{t.persons}</span>
                  </h3>
                  <p className="text-xs text-emerald-400 mt-1 font-semibold">{t.activeTeamAcrossLevels}</p>
                </div>
                <div className="size-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 grid place-items-center text-emerald-400">
                  <Users className="size-6" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0e1726] border border-[#1e293b] flex items-center justify-between shadow-lg">
                <div>
                  <p className="text-xs text-slate-400 font-medium">{t.todayNewMembers}</p>
                  <h3 className="text-3xl font-black text-white mt-1 font-mono">
                    {todayReferralMembers} <span className="text-xs text-slate-400 font-normal">{t.persons}</span>
                  </h3>
                  <p className="text-xs text-teal-300 mt-1 font-semibold">{t.todayJoinedCount}</p>
                </div>
                <div className="size-12 rounded-2xl bg-teal-500/15 border border-teal-500/30 grid place-items-center text-teal-400">
                  <Clock className="size-6" />
                </div>
              </div>
            </div>

            {/* Referrer Table List */}
            <div className="rounded-2xl bg-[#0e1726] border border-[#1e293b] overflow-hidden shadow-xl">
              <div className="p-4 border-b border-[#1e293b] flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <GitFork className="size-4.5 text-emerald-400" />
                    {t.referralsTitle}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t.referralsSubtitle}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#111c2e] border-b border-[#1e293b] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">{t.referrerUser}</th>
                      <th className="py-3.5 px-4">{t.referralCodeCol}</th>
                      <th className="py-3.5 px-4">{t.totalMembersCol}</th>
                      <th className="py-3.5 px-4">{t.todayMembersCol}</th>
                      <th className="py-3.5 px-4">{t.commissionEarnedCol}</th>
                      <th className="py-3.5 px-4 text-right">{t.teamListCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b]">
                    {referrers.map(({ user: u, totalReferred, todayReferred }) => (
                      <tr key={u.id} className="hover:bg-[#121e31] transition-colors">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => {
                              setSelectedReferrer(u);
                              setReferralModalOpen(true);
                            }}
                            className="text-left group cursor-pointer"
                          >
                            <p className="font-bold text-white group-hover:text-emerald-400 transition-colors text-sm underline decoration-dotted underline-offset-4">
                              {u.name}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {u.invite_code || "VTX8829"}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            {totalReferred} {t.persons}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {todayReferred > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold">
                              +{todayReferred} {t.persons}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">
                          {formatTk(totalReferred * 5)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedReferrer(u);
                              setReferralModalOpen(true);
                            }}
                            className="h-7 px-3 text-xs border-[#1e293b] bg-[#111c2e] hover:bg-[#16253c] text-emerald-400 font-semibold"
                          >
                            <Eye className="size-3 mr-1" />
                            {t.viewTeamMembers} ({totalReferred})
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- ৪) উইথড্র রিকোয়েস্ট (Withdraw Requests Tab) ----------------- */}
        {activeTab === "withdrawals" && (
          <div className="space-y-4">
            {/* Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0e1726] p-4 rounded-2xl border border-[#1e293b]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ArrowUpRight className="size-4.5 text-emerald-400" />
                  {t.withdrawalsTitle}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t.withdrawalsSubtitle}
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-[#111c2e] p-1 rounded-xl border border-[#1e293b] text-xs">
                <button
                  onClick={() => setWithdrawalFilter("all")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    withdrawalFilter === "all"
                      ? "bg-emerald-500 text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t.all} ({withdrawals.length})
                </button>
                <button
                  onClick={() => setWithdrawalFilter("pending")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    withdrawalFilter === "pending"
                      ? "bg-amber-500 text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t.pending} ({withdrawals.filter((w) => w.status === "pending").length})
                </button>
                <button
                  onClick={() => setWithdrawalFilter("approved")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    withdrawalFilter === "approved"
                      ? "bg-emerald-600 text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t.approved} ({withdrawals.filter((w) => w.status === "approved").length})
                </button>
                <button
                  onClick={() => setWithdrawalFilter("rejected")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    withdrawalFilter === "rejected"
                      ? "bg-rose-600 text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t.rejected} ({withdrawals.filter((w) => w.status === "rejected").length})
                </button>
              </div>
            </div>

            {/* Withdrawals Table */}
            <div className="rounded-2xl bg-[#0e1726] border border-[#1e293b] overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#111c2e] border-b border-[#1e293b] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">{t.userAndEmailCol}</th>
                      <th className="py-3.5 px-4">{t.amountCol}</th>
                      <th className="py-3.5 px-4">{t.methodCol}</th>
                      <th className="py-3.5 px-4">{t.addressCol}</th>
                      <th className="py-3.5 px-4">{t.timeCol}</th>
                      <th className="py-3.5 px-4">{t.statusCol}</th>
                      <th className="py-3.5 px-4 text-right">{t.actionCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b]">
                    {filteredWithdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                          {t.noWithdrawals}
                        </td>
                      </tr>
                    ) : (
                      filteredWithdrawals.map((w) => (
                        <tr key={w.id} className="hover:bg-[#121e31] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white text-sm">{w.user_name}</div>
                            <div className="text-slate-400 font-mono text-[11px]">{w.user_email}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-base text-emerald-400">
                            {formatTk(w.amount)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[11px] border border-slate-700">
                              {w.network}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[150px]">{w.address}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(w.address);
                                  toast.success(t.copiedAddress);
                                }}
                                className="text-slate-400 hover:text-white"
                                title="Copy"
                              >
                                <Copy className="size-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                            {formatDate(w.created_at)}
                          </td>
                          <td className="py-3.5 px-4">
                            {w.status === "pending" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                <Clock className="size-3" /> {t.pending}
                              </span>
                            )}
                            {w.status === "approved" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                <CheckCircle2 className="size-3" /> {t.approved}
                              </span>
                            )}
                            {w.status === "rejected" && (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                                  <XCircle className="size-3" /> {t.rejected}
                                </span>
                                {w.reject_reason && (
                                  <p className="text-[10px] text-rose-300/80 mt-1 max-w-[160px] truncate" title={w.reject_reason}>
                                    {t.reason}: {w.reject_reason}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {w.status === "pending" ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  onClick={() => setApproveConfirmId(w.id)}
                                  className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm shadow-emerald-600/30"
                                >
                                  {t.approve}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setRejectId(w.id);
                                    setRejectReason("");
                                  }}
                                  className="h-7 px-2.5 text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-sm shadow-rose-600/30"
                                >
                                  {t.reject}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px] italic">
                                {w.status === "approved" ? t.completed : t.cancelled}
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
      </main>

      {/* ----------------- User Details Modal ----------------- */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent className="max-w-md bg-[#0e1726] border-[#1e293b] text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <UserCheck className="size-5 text-emerald-400" />
              {t.userDetailsTitle}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              {t.userDetailsDesc}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-3.5 text-xs py-2">
              <div className="p-3 rounded-xl bg-[#111c2e] border border-[#1e293b] space-y-1">
                <p className="text-sm font-bold text-white">{selectedUser.name}</p>
                <p className="text-slate-400 font-mono">{selectedUser.email}</p>
                <p className="text-slate-400 font-mono">{selectedUser.phone || t.phoneNotSet}</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-[#111c2e] border border-[#1e293b]">
                  <span className="text-slate-400 text-[11px]">{t.currentBalance}</span>
                  <p className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                    {formatTk(selectedUser.balance)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#111c2e] border border-[#1e293b]">
                  <span className="text-slate-400 text-[11px]">{t.referralCode}</span>
                  <p className="text-base font-bold font-mono text-white mt-0.5">
                    {selectedUser.invite_code || "VTX8829"}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#111c2e] border border-[#1e293b]">
                  <span className="text-slate-400 text-[11px]">{t.depositCol}</span>
                  <p className="text-sm font-bold font-mono text-slate-200 mt-0.5">
                    {formatTk(selectedUser.total_deposit)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#111c2e] border border-[#1e293b]">
                  <span className="text-slate-400 text-[11px]">{t.withdrawCol}</span>
                  <p className="text-sm font-bold font-mono text-slate-200 mt-0.5">
                    {formatTk(selectedUser.total_withdraw)}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#111c2e] border border-[#1e293b] flex items-center justify-between">
                <span className="text-slate-400">{t.accountStatus}:</span>
                <span className={`font-bold ${selectedUser.status === "active" ? "text-emerald-400" : "text-rose-400"}`}>
                  {selectedUser.status === "active" ? t.active : t.blocked}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setUserModalOpen(false)} className="border-[#1e293b] text-slate-300">
              {t.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------- Referrer's Team Members Modal ----------------- */}
      <Dialog open={referralModalOpen} onOpenChange={setReferralModalOpen}>
        <DialogContent className="max-w-lg bg-[#0e1726] border-[#1e293b] text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <GitFork className="size-4.5 text-emerald-400" />
              {selectedReferrer ? t.teamModalTitle(selectedReferrer.name) : ""}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              {selectedReferrer ? t.teamModalDesc(selectedReferrer.invite_code || "VTX8829") : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-72 overflow-y-auto space-y-2 py-2">
            {selectedReferrer &&
              users
                .filter((sub) => sub.referred_by === selectedReferrer.id || sub.referred_by === selectedReferrer.invite_code)
                .map((member) => (
                  <div
                    key={member.id}
                    className="p-3 rounded-xl bg-[#111c2e] border border-[#1e293b] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-white text-sm">{member.name}</p>
                      <p className="text-slate-400 font-mono text-[11px]">{member.email}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{formatDate(member.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {t.balanceCol}: {formatTk(member.balance)}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {t.depositCol}: {formatTk(member.total_deposit)}
                      </p>
                    </div>
                  </div>
                ))}

            {selectedReferrer &&
              users.filter((sub) => sub.referred_by === selectedReferrer.id || sub.referred_by === selectedReferrer.invite_code).length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  {t.noMembersYet}
                </div>
              )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReferralModalOpen(false)} className="border-[#1e293b] text-slate-300">
              {t.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------- Approve Confirmation Dialog ----------------- */}
      <AlertDialog open={approveConfirmId !== null} onOpenChange={(open) => !open && setApproveConfirmId(null)}>
        <AlertDialogContent className="max-w-md bg-[#0e1726] border-[#1e293b] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-400" />
              {t.approveDialogTitle}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-400 leading-relaxed">
              {t.approveDialogDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isProcessingApprove}
              className="border-[#1e293b] bg-transparent text-slate-300 hover:bg-[#111c2e]"
            >
              {t.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isProcessingApprove}
              onClick={handleApprove}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              {isProcessingApprove ? t.processing : t.confirmApprove}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ----------------- Reject Reason Modal ----------------- */}
      <Dialog open={rejectId !== null} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent className="max-w-md bg-[#0e1726] border-[#1e293b] text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <XCircle className="size-5 text-rose-500" />
              {t.rejectDialogTitle}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              {t.rejectDialogDesc}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <label className="block space-y-1">
              <span className="font-semibold text-slate-300">{t.rejectReasonLabel}</span>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t.rejectReasonPlaceholder}
                className="bg-[#111c2e] border-[#1e293b] text-white text-xs h-10 rounded-xl focus-visible:ring-rose-500"
              />
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={isProcessingReject}
              onClick={() => setRejectId(null)}
              className="border-[#1e293b] text-slate-300"
            >
              {t.cancel}
            </Button>
            <Button
              disabled={isProcessingReject}
              onClick={handleReject}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
            >
              {isProcessingReject ? t.processing : t.confirmReject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
