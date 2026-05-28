"use client";

import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import {
    Wallet,
    Receipt,
    PieChart,
    ArrowUpRight,
    TrendingUp,
    TrendingDown,
    Send,
    Mail,
    Loader2,
    RefreshCw,
    Plus,
    Upload,
    Building2,
    Activity,
    FileText,
    ChevronLeft,
    ChevronRight,
    Search,
    Bell
} from "lucide-react";
import {
    PieChart as RechartsPie,
    Pie,
    Cell,
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Area,
    AreaChart,
    BarChart as RechartsBar,
    Bar,
} from "recharts";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToFirstScrollableAncestor } from "@dnd-kit/modifiers";
import { SortableDashboardCard } from "@/components/dashboard/SortableDashboardCard";
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, isSameMonth } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { usePrivacyStore } from "@/store/privacyStore";
import { useDateStore } from "@/store/useDateStore";
import { refreshPortfolio } from "@/app/actions/stocks";
import { refreshMFPortfolio } from "@/app/actions/mutual-funds";
import { toast } from "sonner";
import { sendMonthlyAnalysisReport } from "@/app/actions/hub-reports";
import { updateUserSettings } from "@/app/actions/user";

const CHART_COLORS = [
    "#7c3aed",
    "#0ea5e9",
    "#10b981",
    "#db2777",
    "#f59e0b",
    "#3b82f6",
];

export default function DashboardClient({
    expenses,
    categories,
    stocks = [],
    funds = [],
    bankAccounts = [],
    showStocksInSummary,
    showMutualFundsInSummary,
    showMoneyManagementInSummary,
    syncResult,
    userSettings,
}: any) {
    const router = useRouter();
    const { isPrivacyUnlocked } = usePrivacyStore();
    const { selectedMonth } = useDateStore();

    const isPrivacyActive = userSettings?.isPrivacyEnabled && !isPrivacyUnlocked;
    const [chartType, setChartType] = useState<"income-vs-expenses" | "spending-velocity">("income-vs-expenses");

    useEffect(() => {
        if (syncResult?.success && syncResult.categories?.length > 0) {
            syncResult.categories.forEach((catName: string) => {
                toast.success(`Auto-generated: ${catName}`, {
                    description: `Recurring entry completed for today`,
                    icon: "🤖",
                });
            });
        }
    }, [syncResult]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [widgets, setWidgets] = useState(() => {
        let currentWidgets: any[] = [];

        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("dashboard-config-v4");
            if (saved) {
                currentWidgets = JSON.parse(saved);
            }
        }

        if (currentWidgets.length === 0) {
            currentWidgets = [
                { id: "stats", size: 6 },
                { id: "trend", size: 3 },
                { id: "history", size: 3 },
                { id: "breakdown-pie", size: 3 },
                { id: "breakdown-detailed", size: 3 },
                { id: "recent", size: 6 },
            ];
        }

        let updatedWidgets = [...currentWidgets];
        const hasStocks = updatedWidgets.some(w => w.id === "stocks");
        const hasFunds = updatedWidgets.some(w => w.id === "funds");
        const hasBanks = updatedWidgets.some(w => w.id === "banks");

        if (showStocksInSummary && !hasStocks) {
            updatedWidgets.unshift({ id: "stocks", size: 6 });
        } else if (!showStocksInSummary && hasStocks) {
            updatedWidgets = updatedWidgets.filter(w => w.id !== "stocks");
        }

        if (showMutualFundsInSummary && !hasFunds) {
            const stocksIdx = updatedWidgets.findIndex(w => w.id === "stocks");
            updatedWidgets.splice(stocksIdx !== -1 ? stocksIdx + 1 : 0, 0, { id: "funds", size: 6 });
        } else if (!showMutualFundsInSummary && hasFunds) {
            updatedWidgets = updatedWidgets.filter(w => w.id !== "funds");
        }

        if (showMoneyManagementInSummary && !hasBanks) {
            const fundsIdx = updatedWidgets.findIndex(w => w.id === "funds");
            const stocksIdx = updatedWidgets.findIndex(w => w.id === "stocks");
            const insertIdx = fundsIdx !== -1 ? fundsIdx + 1 : (stocksIdx !== -1 ? stocksIdx + 1 : 0);
            updatedWidgets.splice(insertIdx, 0, { id: "banks", size: 6 });
        } else if (!showMoneyManagementInSummary && hasBanks) {
            updatedWidgets = updatedWidgets.filter(w => w.id !== "banks");
        }

        return updatedWidgets;
    });

    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [reportMonth, setReportMonth] = useState(format(new Date(), "yyyy-MM"));
    const [sendingReport, setSendingReport] = useState(false);

    // Budget Prompt State
    const [budgetPromptOpen, setBudgetPromptOpen] = useState(false);
    const [newBudgetTarget, setNewBudgetTarget] = useState(userSettings?.monthlyExpenseLimit?.toString() || "");
    const [savingBudget, setSavingBudget] = useState(false);

    useEffect(() => {
        const today = new Date();
        const currentMonthString = format(today, "yyyy-MM");
        
        // Only trigger on the 1st of the month, and only if not already prompted this month
        if (today.getDate() === 1 && userSettings?.lastBudgetPromptMonth !== currentMonthString) {
            setBudgetPromptOpen(true);
        }
    }, [userSettings]);

    const handleSaveMonthlyBudget = async () => {
        setSavingBudget(true);
        try {
            await updateUserSettings({
                monthlyExpenseLimit: parseFloat(newBudgetTarget) || 0,
                lastBudgetPromptMonth: format(new Date(), "yyyy-MM"),
            });
            toast.success("Monthly budget set!");
            setBudgetPromptOpen(false);
            window.location.reload();
        } catch (error) {
            toast.error("Failed to set budget.");
        } finally {
            setSavingBudget(false);
        }
    };

    const handleDismissBudgetPrompt = async () => {
        try {
            await updateUserSettings({ lastBudgetPromptMonth: format(new Date(), "yyyy-MM") });
            setBudgetPromptOpen(false);
            // We do a soft dismiss without reloading
        } catch (error) {
            // Ignore failure on dismiss
            setBudgetPromptOpen(false); 
        }
    };

    const handleSendHubReport = async () => {
        setSendingReport(true);
        try {
            await sendMonthlyAnalysisReport(reportMonth);
            toast.success(`Analysis report sent!`);
            setReportDialogOpen(false);
        } catch (error) {
            toast.error("Failed to send analysis report.");
        } finally {
            setSendingReport(false);
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const stats = useMemo(() => {
        const currentMonthStart = startOfMonth(selectedMonth);
        const currentMonthEnd = endOfMonth(selectedMonth);
        const lastMonthStart = startOfMonth(subMonths(selectedMonth, 1));
        const lastMonthEnd = endOfMonth(subMonths(selectedMonth, 1));

        // Expenses
        const currentMonthExpenses = expenses.filter((e: any) => {
            const date = new Date(e.date);
            return isSameMonth(date, selectedMonth);
        });

        const lastMonthExpenses = expenses.filter((e: any) => {
            const date = new Date(e.date);
            return isWithinInterval(date, { start: lastMonthStart, end: lastMonthEnd });
        });

        const currentTotal = currentMonthExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
        const lastTotal = lastMonthExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

        // Income vs Expense Chart (Last 6 Months relative to selectedMonth)
        const monthlyData: { month: string; amount: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const monthDate = subMonths(selectedMonth, i);
            const mStart = startOfMonth(monthDate);
            const mEnd = endOfMonth(monthDate);
            const mTotal = expenses
                .filter((e: any) => {
                    const d = new Date(e.date);
                    return isWithinInterval(d, { start: mStart, end: mEnd });
                })
                .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

            monthlyData.push({
                month: format(monthDate, "MMM"),
                amount: mTotal,
            });
        }

        const averageTotal = monthlyData.reduce((sum, m) => sum + m.amount, 0) / (monthlyData.length || 1);
        const change = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

        const breakdown: Record<string, { name: string; amount: number; color: string }> = {};
        currentMonthExpenses.forEach((expense: any) => {
            const category = expense.category;
            if (category) {
                if (!breakdown[category.id]) {
                    breakdown[category.id] = {
                        name: category.name,
                        amount: 0,
                        color: category.color,
                    };
                }
                breakdown[category.id].amount += Number(expense.amount);
            }
        });
        const categoryStats = Object.values(breakdown).sort((a, b) => b.amount - a.amount);
        const topCategory = categoryStats[0] || null;

        return {
            currentTotal,
            lastTotal,
            averageTotal,
            change,
            monthlyData,
            categoryStats,
            topCategory,
        };
    }, [expenses, userSettings, selectedMonth]);

    const dailyTrend = useMemo(() => {
        const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
        const days: Record<string, number> = {};
        
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), i);
            const key = format(date, "MMM dd");
            days[key] = 0;
        }

        expenses.forEach((expense: any) => {
            const date = new Date(expense.date);
            if (isSameMonth(date, selectedMonth)) {
                const key = format(date, "MMM dd");
                if (days.hasOwnProperty(key)) {
                    days[key] += Number(expense.amount);
                }
            }
        });
        return Object.entries(days).map(([date, amount]) => ({ date, amount }));
    }, [expenses, selectedMonth]);

    const recentExpenses = useMemo(() => {
        return expenses.filter((e: any) => isSameMonth(new Date(e.date), selectedMonth)).slice(0, 5);
    }, [expenses, selectedMonth]);

    const { user: clerkUser } = useUser();
    const firstName = clerkUser?.firstName || "Arjun";

    const totalReceived = useMemo(() => {
        let sum = 0;
        bankAccounts.forEach((acc: any) => {
            const statement = acc.statements?.find((s: any) => isSameMonth(new Date(s.month), selectedMonth));
            if (statement) {
                sum += Number(statement.totalReceived || 0);
            }
        });
        return sum;
    }, [bankAccounts, selectedMonth]);

    const totalBankBalance = useMemo(() => {
        let sum = 0;
        bankAccounts.forEach((acc: any) => {
            const statement = acc.statements?.find((s: any) => isSameMonth(new Date(s.month), selectedMonth));
            if (statement) {
                sum += Number(statement.closingBalance || 0);
            }
        });
        if (sum === 0 && userSettings?.manualBalance) {
            sum = userSettings.manualBalance;
        }
        return sum;
    }, [bankAccounts, selectedMonth, userSettings]);

    const bankBalances = useMemo(() => {
        return bankAccounts.map((acc: any) => {
            const selectedMonthStatement = acc.statements?.find((s: any) => isSameMonth(new Date(s.month), selectedMonth));
            const latestStatement = acc.statements && acc.statements.length > 0
                ? [...acc.statements].sort((a: any, b: any) => b.month.localeCompare(a.month))[0]
                : null;
            const statement = selectedMonthStatement || latestStatement;
            return {
                id: acc.id,
                bankName: acc.bankName,
                accountNumber: acc.accountNumber,
                balance: statement ? Number(statement.closingBalance || 0) : 0,
            };
        });
    }, [bankAccounts, selectedMonth]);

    const lastMonthStats = useMemo(() => {
        const lastMonth = subMonths(selectedMonth, 1);
        let receivedSum = 0;
        const spentSum = expenses
            .filter((e: any) => isSameMonth(new Date(e.date), lastMonth))
            .reduce((sum: number, e: any) => sum + Number(e.amount), 0);
            
        bankAccounts.forEach((acc: any) => {
            const statement = acc.statements?.find((s: any) => isSameMonth(new Date(s.month), lastMonth));
            if (statement) {
                receivedSum += Number(statement.totalReceived || 0);
            }
        });
        
        const netSavings = receivedSum - spentSum;
        
        let balanceSum = 0;
        bankAccounts.forEach((acc: any) => {
            const statement = acc.statements?.find((s: any) => isSameMonth(new Date(s.month), lastMonth));
            if (statement) {
                balanceSum += Number(statement.closingBalance || 0);
            }
        });
        if (balanceSum === 0 && userSettings?.manualBalance) {
            balanceSum = userSettings.manualBalance;
        }
        
        return {
            received: receivedSum,
            spent: spentSum,
            savings: netSavings,
            balance: balanceSum
        };
    }, [expenses, bankAccounts, selectedMonth, userSettings]);

    const trends = useMemo(() => {
        const getChange = (curr: number, prev: number) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return ((curr - prev) / prev) * 100;
        };
        
        return {
            receivedChange: getChange(totalReceived, lastMonthStats.received),
            spentChange: getChange(stats.currentTotal, lastMonthStats.spent),
            savingsChange: getChange(totalReceived - stats.currentTotal, lastMonthStats.savings),
            balanceChange: getChange(totalBankBalance, lastMonthStats.balance)
        };
    }, [totalReceived, stats.currentTotal, totalBankBalance, lastMonthStats]);

    const autoExpenses = useMemo(() => {
        return expenses.filter((e: any) => e.isAutoGenerated && isSameMonth(new Date(e.date), selectedMonth)).slice(0, 8);
    }, [expenses, selectedMonth]);

    const activeCategoriesCount = useMemo(() => {
        const currentMonthExpenses = expenses.filter((e: any) => isSameMonth(new Date(e.date), selectedMonth));
        const activeIds = new Set(currentMonthExpenses.map((e: any) => e.categoryId));
        return activeIds.size;
    }, [expenses, selectedMonth]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = widgets.findIndex(w => w.id === active.id);
            const newIndex = widgets.findIndex(w => w.id === over.id);
            const newWidgets = arrayMove(widgets, oldIndex, newIndex);
            setWidgets(newWidgets);
            localStorage.setItem("dashboard-config-v4", JSON.stringify(newWidgets));
        }
    };

    const handleResize = (id: string, action: "grow" | "shrink") => {
        const sizes = [2, 3, 4, 6];
        setWidgets(prev => {
            const newWidgets = prev.map(w => {
                if (w.id === id) {
                    const currentIdx = sizes.indexOf(w.size);
                    let newSize = w.size;
                    if (action === "grow" && currentIdx < sizes.length - 1) {
                        newSize = sizes[currentIdx + 1];
                    } else if (action === "shrink" && currentIdx > 0) {
                        newSize = sizes[currentIdx - 1];
                    }
                    return { ...w, size: newSize };
                }
                return w;
            });
            localStorage.setItem("dashboard-config-v4", JSON.stringify(newWidgets));
            return newWidgets;
        });
    };

    const getColSpan = (size: number) => {
        const colSpans: Record<number, string> = {
            2: "lg:col-span-2",
            3: "lg:col-span-3",
            4: "lg:col-span-4",
            6: "lg:col-span-6",
        };
        return colSpans[size] || "lg:col-span-3";
    };

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto pb-20 px-4 md:px-6 transition-all duration-500">
            {/* Header / Welcome Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-2">
                <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                        Welcome back, {firstName} 👋
                    </p>
                    <h1 className="text-3xl font-black tracking-tight mt-1">Dashboard Overview</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Here's what's happening with your finances in {format(selectedMonth, "MMMM yyyy")}
                    </p>
                </div>
                
                <div className="flex items-center gap-2.5">
                    <Link href="/money-management">
                        <Button variant="outline" size="sm" className="h-9 px-4 text-xs font-bold uppercase tracking-wider border-border/80 hover:bg-white/5 active:scale-[0.98] transition-all">
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Add Bank Account
                        </Button>
                    </Link>
                    <Link href="/money-management">
                        <Button size="sm" className="bg-primary hover:opacity-90 h-9 px-4 text-xs font-bold uppercase tracking-wider glow-primary active:scale-[0.98] transition-all">
                            <Upload className="mr-1.5 h-3.5 w-3.5 text-primary-foreground" />
                            Upload Statement
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Financial Summary Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {
                        title: "Total Received",
                        value: totalReceived,
                        change: trends.receivedChange,
                        icon: <TrendingUp className="h-4 w-4 text-emerald-500" />,
                        iconBg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
                        trendColor: "text-emerald-500 bg-emerald-500/5 border-emerald-500/10"
                    },
                    {
                        title: "Total Spent",
                        value: stats.currentTotal,
                        change: trends.spentChange,
                        icon: <TrendingDown className="h-4 w-4 text-rose-500" />,
                        iconBg: "bg-rose-500/10 border-rose-500/20 text-rose-500",
                        trendColor: "text-rose-500 bg-rose-500/5 border-rose-500/10"
                    },
                    {
                        title: "Net Savings",
                        value: totalReceived - stats.currentTotal,
                        change: trends.savingsChange,
                        icon: (totalReceived - stats.currentTotal) >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-rose-500" />,
                        iconBg: (totalReceived - stats.currentTotal) >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20",
                        trendColor: (totalReceived - stats.currentTotal) >= 0 ? "text-emerald-500 bg-emerald-500/5 border-emerald-500/10" : "text-rose-500 bg-rose-500/5 border-rose-500/10"
                    },
                    {
                        title: "Closing Balance",
                        value: totalBankBalance,
                        change: trends.balanceChange,
                        icon: <Wallet className="h-4 w-4 text-blue-500" />,
                        iconBg: "bg-blue-500/10 border-blue-500/20 text-blue-500",
                        trendColor: "text-blue-500 bg-blue-500/5 border-blue-500/10"
                    }
                ].map((card, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 100, damping: 15, delay: i * 0.05 }}
                        whileHover={{ y: -2, scale: 1.005 }}
                        className="glass-card p-4 flex flex-col justify-between"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{card.title}</span>
                                <p className="text-2xl font-black mt-1 leading-none tracking-tight">
                                    {isPrivacyActive && card.title === "Closing Balance" ? "₹****" : `₹${card.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </p>
                            </div>
                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center border", card.iconBg)}>
                                {card.icon}
                            </div>
                        </div>
                        <div className="mt-3 flex items-center">
                            <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded border flex items-center gap-0.5", card.trendColor)}>
                                {card.change >= 0 ? "↑" : "↓"} {Math.abs(card.change).toFixed(1)}%
                            </span>
                            <span className="text-[9px] text-muted-foreground ml-1.5 uppercase font-semibold">vs Apr</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Bank Accounts Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.2 }}
                className="glass-card p-4 space-y-4"
            >
                <div className="flex justify-between items-center">
                    <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Bank Accounts</h2>
                    <Link href="/money-management" className="text-xs text-primary font-bold hover:underline flex items-center gap-1 active:scale-95 transition-transform">
                        View All <ChevronRight className="h-3 w-3" />
                    </Link>
                </div>
                
                {bankBalances.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                        No bank accounts linked. Click "Add Bank Account" to link one.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {bankBalances.map((bank: any) => {
                            const branding = getBankBranding(bank.bankName);
                            return (
                                <motion.div
                                    key={bank.id}
                                    whileHover={{ scale: 1.01 }}
                                    className="p-3 rounded-xl bg-white/[0.02] border border-border/80 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <BankLogo bankName={bank.bankName} />
                                        <div>
                                            <span className="font-extrabold text-xs leading-none">{branding.displayName}</span>
                                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">XXXX {bank.accountNumber.slice(-4)}</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-black text-primary-foreground tracking-tight">
                                        {isPrivacyActive ? "₹****" : `₹${bank.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </motion.div>

            {/* Stocks & Mutual Funds Summary Row */}
            {(showStocksInSummary || showMutualFundsInSummary) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {showStocksInSummary && (
                        (() => {
                            const totalInvestment = stocks.reduce((sum: number, s: any) => sum + (s.quantity * s.avgPrice), 0);
                            const currentValue = stocks.reduce((sum: number, s: any) => sum + (s.quantity * s.currentPrice), 0);
                            const totalPL = currentValue - totalInvestment;
                            const plPercent = totalInvestment > 0 ? (totalPL / totalInvestment) * 100 : 0;
                            return (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.25 }}
                                    className="glass-card p-4 space-y-4"
                                >
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <Activity className="h-4 w-4 text-primary" /> Stock Portfolio
                                        </h2>
                                        <Link href="/stocks" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                                            Manage <ChevronRight className="h-3 w-3" />
                                        </Link>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-border/80">
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Invested</p>
                                            <p className="text-sm font-black mt-0.5">₹{totalInvestment.toLocaleString()}</p>
                                        </div>
                                        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-border/80">
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Current</p>
                                            <p className="text-sm font-black mt-0.5">₹{currentValue.toLocaleString()}</p>
                                        </div>
                                        <div className={cn("p-2.5 rounded-lg border", totalPL >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20")}>
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Returns</p>
                                            <p className={cn("text-sm font-black mt-0.5", totalPL >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                                {totalPL >= 0 ? "+" : ""}₹{Math.abs(totalPL).toLocaleString()} ({plPercent.toFixed(1)}%)
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })()
                    )}

                    {showMutualFundsInSummary && (
                        (() => {
                            const totalInvestment = funds.reduce((sum: number, s: any) => sum + (s.quantity * s.avgPrice), 0);
                            const currentValue = funds.reduce((sum: number, s: any) => sum + (s.quantity * s.currentPrice), 0);
                            const totalPL = currentValue - totalInvestment;
                            const plPercent = totalInvestment > 0 ? (totalPL / totalInvestment) * 100 : 0;
                            return (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.25 }}
                                    className="glass-card p-4 space-y-4"
                                >
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <FileText className="h-4 w-4 text-indigo-500" /> Mutual Funds Hub
                                        </h2>
                                        <Link href="/mutual-funds" className="text-xs text-indigo-500 font-bold hover:underline flex items-center gap-1">
                                            Manage <ChevronRight className="h-3 w-3" />
                                        </Link>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-border/80">
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Invested</p>
                                            <p className="text-sm font-black mt-0.5">₹{totalInvestment.toLocaleString()}</p>
                                        </div>
                                        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-border/80">
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Current</p>
                                            <p className="text-sm font-black mt-0.5">₹{currentValue.toLocaleString()}</p>
                                        </div>
                                        <div className={cn("p-2.5 rounded-lg border", totalPL >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20")}>
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Returns</p>
                                            <p className={cn("text-sm font-black mt-0.5", totalPL >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                                {totalPL >= 0 ? "+" : ""}₹{Math.abs(totalPL).toLocaleString()} ({plPercent.toFixed(1)}%)
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })()
                    )}
                </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Column 1: Cashflow Overview */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.3 }}
                    className="glass-card p-4 space-y-4"
                >
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Cashflow Overview</h2>
                            <p className="text-[10px] text-muted-foreground uppercase mt-0.5">{format(selectedMonth, "MMMM yyyy")}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        {/* Donut Chart */}
                        <div className="md:col-span-6 h-48 relative flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPie>
                                    <Pie
                                        data={stats.categoryStats}
                                        innerRadius={55}
                                        outerRadius={75}
                                        paddingAngle={3}
                                        dataKey="amount"
                                        stroke="none"
                                    >
                                        {stats.categoryStats.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </RechartsPie>
                            </ResponsiveContainer>
                            <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">Total</span>
                                <span className="text-lg font-black tracking-tight">₹{stats.currentTotal.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Custom Legend */}
                        <div className="md:col-span-6 space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                            {stats.categoryStats.slice(0, 5).map((cat, i) => {
                                const percentage = (cat.amount / stats.currentTotal) * 100 || 0;
                                return (
                                    <div key={i} className="flex justify-between items-center text-xs p-1">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: cat.color || CHART_COLORS[i % CHART_COLORS.length] }} />
                                            <span className="font-extrabold text-[11px] truncate max-w-[100px] text-primary-foreground uppercase">{cat.name}</span>
                                        </div>
                                        <div className="text-right flex items-center gap-3">
                                            <span className="text-[10px] text-muted-foreground">{percentage.toFixed(1)}%</span>
                                            <span className="font-bold text-[11px]">₹{cat.amount.toLocaleString()}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            {stats.categoryStats.length === 0 && (
                                <p className="text-xs text-muted-foreground text-center py-8">No expenses this month.</p>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Column 2: Income vs Expenses */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.35 }}
                    className="glass-card p-4 space-y-4"
                >
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">
                                {chartType === "income-vs-expenses" ? "Income vs Expenses" : "Spending Velocity"}
                            </h2>
                            <p className="text-[10px] text-muted-foreground uppercase mt-0.5">{format(selectedMonth, "MMMM yyyy")}</p>
                        </div>
                        
                        {/* Toggle Switches */}
                        <div className="flex rounded-lg bg-white/5 border border-border p-0.5">
                            <button
                                onClick={() => setChartType("income-vs-expenses")}
                                className={cn("px-2.5 py-1 text-[9px] font-bold uppercase rounded-md transition-all", chartType === "income-vs-expenses" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                            >
                                Compare
                            </button>
                            <button
                                onClick={() => setChartType("spending-velocity")}
                                className={cn("px-2.5 py-1 text-[9px] font-bold uppercase rounded-md transition-all", chartType === "spending-velocity" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                            >
                                Velocity
                            </button>
                        </div>
                    </div>

                    <div className="h-48 mt-2">
                        <AnimatePresence mode="wait">
                            {chartType === "income-vs-expenses" ? (
                                <motion.div
                                    key="compare"
                                    initial={{ opacity: 0, scale: 0.99 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.99 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-full h-full"
                                >
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsBar
                                            data={[
                                                {
                                                    name: format(selectedMonth, "MMMM"),
                                                    Received: totalReceived,
                                                    Spent: stats.currentTotal,
                                                }
                                            ]}
                                            barSize={32}
                                            barGap={8}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} />
                                            <Tooltip contentStyle={{ background: "#0c101c", border: "1px solid #1c2234", borderRadius: "8px", fontSize: "10px" }} />
                                            <Bar dataKey="Received" fill="#10b981" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="Spent" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                        </RechartsBar>
                                    </ResponsiveContainer>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="velocity"
                                    initial={{ opacity: 0, scale: 0.99 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.99 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-full h-full"
                                >
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={dailyTrend}>
                                            <defs>
                                                <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} />
                                            <Tooltip contentStyle={{ background: "#0c101c", border: "1px solid #1c2234", borderRadius: "8px", fontSize: "10px" }} />
                                            <Area type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2.5} fill="url(#spendingGradient)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>

            {/* Quick Budgets Row (4 items) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Top Category */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.4 }}
                    whileHover={{ y: -1 }}
                    className="glass-card p-4 flex flex-col justify-between"
                >
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Top Category</span>
                        <h3 className="text-xl font-black mt-1 uppercase tracking-tight">{stats.topCategory?.name || "N/A"}</h3>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                            {stats.topCategory ? `${((stats.topCategory.amount / stats.currentTotal) * 100 || 0).toFixed(1)}% of total spending` : "No expenses yet"}
                        </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-black text-primary">₹{stats.topCategory?.amount?.toLocaleString() || "0"}</span>
                        <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                </motion.div>

                {/* Card 2: Monthly Budget */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.45 }}
                    whileHover={{ y: -1 }}
                    className="glass-card p-4 flex flex-col justify-between cursor-pointer"
                    onClick={() => setBudgetPromptOpen(true)}
                >
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Monthly Budget</span>
                        <h3 className="text-xl font-black mt-1 tracking-tight">
                            ₹{userSettings?.monthlyExpenseLimit ? Math.max(0, userSettings.monthlyExpenseLimit - stats.currentTotal).toLocaleString() : "No Limit"}
                        </h3>
                        <p className="text-[9px] text-muted-foreground mt-0.5">Left</p>
                    </div>
                    <div className="mt-3 space-y-1">
                        {userSettings?.monthlyExpenseLimit ? (
                            <>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={cn("h-full rounded-full", (stats.currentTotal / userSettings.monthlyExpenseLimit) > 0.9 ? "bg-rose-500" : "bg-primary")}
                                        style={{ width: `${Math.min(100, (stats.currentTotal / userSettings.monthlyExpenseLimit) * 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[8px] font-bold text-muted-foreground">
                                    <span>{((stats.currentTotal / userSettings.monthlyExpenseLimit) * 100).toFixed(0)}% Used</span>
                                </div>
                            </>
                        ) : (
                            <span className="text-[9px] text-primary hover:underline">Click to set budget limit</span>
                        )}
                    </div>
                </motion.div>

                {/* Card 3: Budget Status */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.5 }}
                    whileHover={{ y: -1 }}
                    className="glass-card p-4 flex flex-col justify-between"
                >
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Budget Status</span>
                        <h3 className="text-xl font-black mt-1 tracking-tight">
                            {userSettings?.monthlyExpenseLimit ? `₹${Math.max(0, userSettings.monthlyExpenseLimit - stats.currentTotal).toLocaleString()} left` : "Unmanaged"}
                        </h3>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                            {userSettings?.monthlyExpenseLimit ? `Out of ₹${userSettings.monthlyExpenseLimit.toLocaleString()}` : "No budget limit configured"}
                        </p>
                    </div>
                    <div className="mt-3">
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full rounded-full", (stats.currentTotal / (userSettings?.monthlyExpenseLimit || 1)) > 0.9 ? "bg-rose-500" : "bg-emerald-500")}
                                style={{ width: `${Math.min(100, (stats.currentTotal / (userSettings?.monthlyExpenseLimit || 1)) * 100)}%` }}
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Card 4: Expenses This Month */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.55 }}
                    whileHover={{ y: -1 }}
                    className="glass-card p-4 flex flex-col justify-between"
                >
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Expenses This Month</span>
                        <h3 className="text-xl font-black mt-1 tracking-tight">₹{stats.currentTotal.toLocaleString()}</h3>
                        <p className="text-[9px] text-muted-foreground mt-0.5">Across {activeCategoriesCount} active categories</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground">Detailed Tracker</span>
                        <Link href="/expenses" className="text-[9px] text-primary font-bold hover:underline">VIEW LIST</Link>
                    </div>
                </motion.div>
            </div>

            {/* Recent Activity & Top Categories Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Column 1: Recent Activity */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.6 }}
                    className="glass-card p-4 space-y-4"
                >
                    <div className="flex justify-between items-center border-b border-border/40 pb-2">
                        <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Recent Activity</h2>
                        <Link href="/expenses" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                            View All <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1.5">
                        {recentExpenses.map((expense: any, idx: number) => (
                            <motion.div
                                key={expense.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.04 }}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.01] border border-border/40 hover:bg-white/[0.03] transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-8.5 w-8.5 rounded-lg flex items-center justify-center text-base bg-white/[0.04] shrink-0 border border-border">
                                        {expense.category?.icon || "💰"}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold leading-tight truncate text-primary-foreground max-w-[150px] md:max-w-[200px]">
                                            {expense.description || expense.category?.name}
                                        </p>
                                        <p className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wider">
                                            {format(new Date(expense.date), "dd MMM yyyy")}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    <span className={cn("text-[8px] font-black px-1.5 py-0.5 rounded tracking-wide border", expense.isAutoGenerated ? "bg-purple-500/10 border-purple-500/20 text-purple-500" : "bg-blue-500/10 border-blue-500/20 text-blue-500")}>
                                        {expense.isAutoGenerated ? "AUTO" : "MANUAL"}
                                    </span>
                                    <p className="font-extrabold text-xs text-primary-foreground">
                                        -₹{Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                        {recentExpenses.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-12">No recent transactions.</p>
                        )}
                    </div>
                </motion.div>

                {/* Column 2: Top Categories */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.65 }}
                    className="glass-card p-4 space-y-4"
                >
                    <div className="flex justify-between items-center border-b border-border/40 pb-2">
                        <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Top Categories</h2>
                        <Link href="/categories" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                            View All <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>

                    <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-1.5 py-1">
                        {stats.categoryStats.slice(0, 5).map((cat, i) => {
                            const percentage = (cat.amount / stats.currentTotal) * 100 || 0;
                            return (
                                <div key={i} className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-muted-foreground uppercase text-[10px] tracking-wider">{cat.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-muted-foreground">{percentage.toFixed(0)}%</span>
                                            <span>₹{cat.amount.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percentage}%` }}
                                            transition={{ type: "spring", stiffness: 50, damping: 12 }}
                                            className="h-full rounded-full"
                                            style={{ background: cat.color || CHART_COLORS[i % CHART_COLORS.length] }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        {stats.categoryStats.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-12">No category data available.</p>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Activity Stream Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.7 }}
                className="glass-card p-4 space-y-4"
            >
                <div className="flex justify-between items-center">
                    <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Activity className="h-4 w-4 text-purple-500" /> Activity Stream
                    </h2>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-2 pt-1 scroll-smooth snap-x custom-scrollbar pr-4">
                    {autoExpenses.map((expense: any) => (
                        <div
                            key={expense.id}
                            className="snap-start shrink-0 w-64 p-3.5 rounded-xl bg-white/[0.01] border border-border/80 flex flex-col justify-between gap-4 transition-all duration-300 hover:border-purple-500/20"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg flex items-center justify-center text-lg bg-purple-500/10 border border-purple-500/20 text-purple-500">
                                    {expense.category?.icon || "🤖"}
                                </div>
                                <div className="min-w-0">
                                    <span className="font-extrabold text-[11px] uppercase text-muted-foreground leading-none">Auto-generated</span>
                                    <p className="text-xs font-black leading-tight truncate text-primary-foreground mt-0.5">
                                        {expense.description || expense.category?.name}
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-between items-end border-t border-border/20 pt-2.5">
                                <span className="text-[10px] text-muted-foreground uppercase">{format(new Date(expense.date), "MMM dd")}</span>
                                <span className="text-sm font-black text-purple-500">₹{Number(expense.amount).toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                    {autoExpenses.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-6 w-full">No recurring activities this month.</p>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

const getBankBranding = (bankName: string) => {
    switch (bankName.toUpperCase()) {
        case "AXIS":
            return {
                bg: "bg-[#861f41]/10 border-[#861f41]/20 text-[#861f41]",
                logoColor: "#861f41",
                displayName: "AXIS BANK",
            };
        case "BOB":
            return {
                bg: "bg-[#f05a28]/10 border-[#f05a28]/20 text-[#f05a28]",
                logoColor: "#f05a28",
                displayName: "BOB",
            };
        case "KOTAK":
            return {
                bg: "bg-[#ec1c24]/10 border-[#ec1c24]/20 text-[#ec1c24]",
                logoColor: "#ec1c24",
                displayName: "KOTAK",
            };
        case "SBI":
            return {
                bg: "bg-[#00a5ec]/10 border-[#00a5ec]/20 text-[#00a5ec]",
                logoColor: "#00a5ec",
                displayName: "SBI",
            };
        default:
            return {
                bg: "bg-primary/10 border-primary/20 text-primary",
                logoColor: "#7c3aed",
                displayName: bankName,
            };
    }
};

const BankLogo = ({ bankName }: { bankName: string }) => {
    const normName = bankName.toUpperCase();
    if (normName === "AXIS") {
        return (
            <div className="h-8 w-8 rounded-lg bg-[#861f41]/10 flex items-center justify-center border border-[#861f41]/20">
                <span className="font-black text-xs text-[#861f41]">A</span>
            </div>
        );
    }
    if (normName === "BOB") {
        return (
            <div className="h-8 w-8 rounded-lg bg-[#f05a28]/10 flex items-center justify-center border border-[#f05a28]/20">
                <span className="font-black text-xs text-[#f05a28]">B</span>
            </div>
        );
    }
    if (normName === "KOTAK") {
        return (
            <div className="h-8 w-8 rounded-lg bg-[#ec1c24]/10 flex items-center justify-center border border-[#ec1c24]/20">
                <span className="font-black text-xs text-[#ec1c24]">K</span>
            </div>
        );
    }
    if (normName === "SBI") {
        return (
            <div className="h-8 w-8 rounded-lg bg-[#00a5ec]/10 flex items-center justify-center border border-[#00a5ec]/20">
                <span className="font-black text-xs text-[#00a5ec]">S</span>
            </div>
        );
    }
    return (
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
            <span className="font-black text-xs text-primary">{bankName.charAt(0)}</span>
        </div>
    );
};

