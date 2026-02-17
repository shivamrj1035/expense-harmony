"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
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
    RefreshCw
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
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, startOfWeek, endOfWeek } from "date-fns";
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
import { refreshPortfolio } from "@/app/actions/stocks";
import { refreshMFPortfolio } from "@/app/actions/mutual-funds";
import { toast } from "sonner";
import { sendMonthlyAnalysisReport } from "@/app/actions/hub-reports";

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
    showStocksInSummary,
    showMutualFundsInSummary,
}: any) {
    const router = useRouter();
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

        return updatedWidgets;
    });

    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [reportMonth, setReportMonth] = useState(format(new Date(), "yyyy-MM"));
    const [sendingReport, setSendingReport] = useState(false);

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
        const now = new Date();
        const currentMonthStart = startOfMonth(now);
        const currentMonthEnd = endOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));

        const currentMonthExpenses = expenses.filter((e: any) => {
            const date = new Date(e.date);
            return isWithinInterval(date, { start: currentMonthStart, end: currentMonthEnd });
        });

        const lastMonthExpenses = expenses.filter((e: any) => {
            const date = new Date(e.date);
            return isWithinInterval(date, { start: lastMonthStart, end: lastMonthEnd });
        });

        const currentTotal = currentMonthExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
        const lastTotal = lastMonthExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

        const monthlyData: { month: string; amount: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const monthDate = subMonths(now, i);
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
    }, [expenses]);

    const dailyTrend = useMemo(() => {
        const now = new Date();
        const days: Record<string, number> = {};
        for (let i = 14; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const key = format(date, "MMM dd");
            days[key] = 0;
        }
        expenses.forEach((expense: any) => {
            const date = new Date(expense.date);
            const key = format(date, "MMM dd");
            if (days.hasOwnProperty(key)) {
                days[key] += Number(expense.amount);
            }
        });
        return Object.entries(days).map(([date, amount]) => ({ date, amount }));
    }, [expenses]);

    const recentExpenses = useMemo(() => {
        return expenses.slice(0, 6);
    }, [expenses]);

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
        <div className="space-y-6 max-w-[1400px] mx-auto pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Analytics Hub</h1>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.2em] mt-0.5">
                        Modular Report Engine • {format(new Date(), "MMMM yyyy")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-1 rounded-md bg-accent/10 border border-accent/20 text-accent uppercase font-black">
                        Custom Layout Active
                    </span>

                    <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-gradient-primary hover:opacity-90 glow-primary h-8 gap-2 text-[10px] font-black uppercase tracking-wider">
                                <Send className="h-3 w-3" />
                                Send Report
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="glass-card border-border sm:max-w-[400px]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Mail className="h-5 w-5 text-primary" />
                                    Analysis Hub Report
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6 pt-4">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    We will generate a high-fidelity analysis of your spending for the selected month and send it directly to your email.
                                </p>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Select Month</Label>
                                    <Input
                                        type="month"
                                        value={reportMonth}
                                        onChange={(e) => setReportMonth(e.target.value)}
                                        className="bg-white/5 border-white/10 h-12 text-lg font-bold"
                                    />
                                </div>
                                <Button
                                    onClick={handleSendHubReport}
                                    className="w-full bg-gradient-primary hover:opacity-90 h-12 text-sm font-black uppercase tracking-widest"
                                    disabled={sendingReport}
                                >
                                    {sendingReport ? "Generating..." : "Dispatch Report"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToFirstScrollableAncestor]}>
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
                    <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
                        {widgets.map((widget: any) => {
                            const { id, size } = widget;
                            const commonProps = {
                                id,
                                className: getColSpan(size),
                                onResize: handleResize,
                                canGrow: size < 6,
                                canShrink: size > 2
                            };

                            if (id === "stocks") {
                                const totalInvestment = stocks.reduce((sum: number, s: any) => sum + (s.quantity * s.avgPrice), 0);
                                const currentValue = stocks.reduce((sum: number, s: any) => sum + (s.quantity * s.currentPrice), 0);
                                const totalPL = currentValue - totalInvestment;
                                const plPercent = totalInvestment > 0 ? (totalPL / totalInvestment) * 100 : 0;

                                return (
                                    <SortableDashboardCard {...commonProps} key={id} title="Stock Portfolio" headerAction={
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => {
                                                setIsRefreshing(true);
                                                try {
                                                    await refreshPortfolio();
                                                    window.location.href = "/dashboard?refresh=true";
                                                } catch (e) { toast.error("Refresh failed") }
                                                finally { setIsRefreshing(false) }
                                            }} disabled={isRefreshing}>
                                                <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
                                            </Button>
                                            <Link href="/stocks" className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full">DETAILS <ArrowUpRight className="h-2.5 w-2.5" /></Link>
                                        </div>
                                    }>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5"><p className="text-[10px] text-muted-foreground uppercase">Invested</p><p className="text-lg font-black">₹{totalInvestment.toLocaleString()}</p></div>
                                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5"><p className="text-[10px] text-muted-foreground uppercase">Current</p><p className="text-lg font-black">₹{currentValue.toLocaleString()}</p></div>
                                            <div className={cn("p-3 rounded-xl border", totalPL >= 0 ? "bg-accent/5 border-accent/20" : "bg-destructive/5 border-destructive/20")}><p className="text-[10px] text-muted-foreground uppercase">Returns</p><p className={cn("text-lg font-black", totalPL >= 0 ? "text-accent" : "text-destructive")}>{totalPL >= 0 ? "+" : ""}₹{Math.abs(totalPL).toLocaleString()} ({plPercent.toFixed(1)}%)</p></div>
                                        </div>
                                    </SortableDashboardCard>
                                );
                            }

                            if (id === "funds") {
                                const totalInvestment = funds.reduce((sum: number, s: any) => sum + (s.quantity * s.avgPrice), 0);
                                const currentValue = funds.reduce((sum: number, s: any) => sum + (s.quantity * s.currentPrice), 0);
                                const totalPL = currentValue - totalInvestment;
                                const plPercent = totalInvestment > 0 ? (totalPL / totalInvestment) * 100 : 0;

                                return (
                                    <SortableDashboardCard {...commonProps} key={id} title="Mutual Funds Hub" headerAction={
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => {
                                                setIsRefreshing(true);
                                                try {
                                                    await refreshMFPortfolio();
                                                    window.location.href = "/dashboard?refresh=true";
                                                } catch (e) { toast.error("Refresh failed") }
                                                finally { setIsRefreshing(false) }
                                            }} disabled={isRefreshing}>
                                                <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
                                            </Button>
                                            <Link href="/mutual-funds" className="text-[10px] text-secondary font-bold bg-secondary/10 px-2 py-0.5 rounded-full">DETAILS <ArrowUpRight className="h-2.5 w-2.5" /></Link>
                                        </div>
                                    }>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5"><p className="text-[10px] text-muted-foreground uppercase">Invested</p><p className="text-lg font-black">₹{totalInvestment.toLocaleString()}</p></div>
                                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5"><p className="text-[10px] text-muted-foreground uppercase">Current</p><p className="text-lg font-black">₹{currentValue.toLocaleString()}</p></div>
                                            <div className={cn("p-3 rounded-xl border", totalPL >= 0 ? "bg-accent/5 border-accent/20" : "bg-destructive/5 border-destructive/20")}><p className="text-[10px] text-muted-foreground uppercase">Returns</p><p className={cn("text-lg font-black", totalPL >= 0 ? "text-accent" : "text-destructive")}>{totalPL >= 0 ? "+" : ""}₹{Math.abs(totalPL).toLocaleString()} ({plPercent.toFixed(1)}%)</p></div>
                                        </div>
                                    </SortableDashboardCard>
                                );
                            }

                            if (id === "stats") {
                                return (
                                    <SortableDashboardCard {...commonProps} key={id} title="Financial Summary">
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                                <p className="text-[10px] text-muted-foreground uppercase">Month Burn</p>
                                                <p className="text-lg font-black">₹{stats.currentTotal.toLocaleString()}</p>
                                                <p className={cn("text-[8px] font-bold", stats.change <= 0 ? "text-accent" : "text-destructive")}>
                                                    {stats.change <= 0 ? "↓" : "↑"}{Math.abs(stats.change).toFixed(0)}% vs last mo
                                                </p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                                <p className="text-[10px] text-muted-foreground uppercase">Top Category</p>
                                                <p className="text-lg font-black truncate">{stats.topCategory?.name || "N/A"}</p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                                <p className="text-[10px] text-muted-foreground uppercase">Mo Average</p>
                                                <p className="text-lg font-black">₹{stats.averageTotal.toLocaleString()}</p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                                <p className="text-[10px] text-muted-foreground uppercase">Active Categories</p>
                                                <p className="text-lg font-black">{categories.length}</p>
                                            </div>
                                        </div>
                                    </SortableDashboardCard>
                                );
                            }

                            if (id === "trend") {
                                return (
                                    <SortableDashboardCard {...commonProps} key={id} title="Spending Velocity">
                                        <div className="h-48 mt-2">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={dailyTrend}>
                                                    <defs><linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} /><stop offset="95%" stopColor="#7c3aed" stopOpacity={0} /></linearGradient></defs>
                                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} />
                                                    <Tooltip contentStyle={{ background: "#000", border: "1px solid #333", borderRadius: "8px", fontSize: "10px" }} />
                                                    <Area type="monotone" dataKey="amount" stroke="#7c3aed" strokeWidth={2} fill="url(#trendGradient)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </SortableDashboardCard>
                                );
                            }

                            if (id === "history") {
                                return (
                                    <SortableDashboardCard {...commonProps} key={id} title="6-Month Pulse">
                                        <div className="h-48 mt-2">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RechartsBar data={stats.monthlyData}>
                                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} />
                                                    <Tooltip contentStyle={{ background: "#000", border: "1px solid #333", borderRadius: "8px", fontSize: "10px" }} />
                                                    <Bar dataKey="amount" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                                                </RechartsBar>
                                            </ResponsiveContainer>
                                        </div>
                                    </SortableDashboardCard>
                                );
                            }

                            if (id === "breakdown-pie") {
                                return (
                                    <SortableDashboardCard {...commonProps} key={id} title="Visual Breakdown">
                                        <div className="h-48 relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RechartsPie>
                                                    <Pie data={stats.categoryStats} innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="amount" stroke="none">
                                                        {stats.categoryStats.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />)}
                                                    </Pie>
                                                    <Tooltip />
                                                </RechartsPie>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                <span className="text-[8px] text-muted-foreground uppercase font-bold">Total</span>
                                                <span className="text-xs font-black">₹{stats.currentTotal.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </SortableDashboardCard>
                                );
                            }

                            if (id === "breakdown-detailed") {
                                return (
                                    <SortableDashboardCard {...commonProps} key={id} title="Category Utilization">
                                        <div className="h-48 overflow-y-auto custom-scrollbar space-y-3 py-1">
                                            {stats.categoryStats.map((cat, i) => {
                                                const percentage = (cat.amount / stats.currentTotal) * 100 || 0;
                                                return (
                                                    <div key={i} className="space-y-1">
                                                        <div className="flex justify-between text-[10px] font-bold">
                                                            <span className="text-muted-foreground uppercase">{cat.name}</span>
                                                            <span>₹{cat.amount.toLocaleString()}</span>
                                                        </div>
                                                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full" style={{ width: `${percentage}%`, background: cat.color || CHART_COLORS[i % CHART_COLORS.length] }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </SortableDashboardCard>
                                );
                            }

                            if (id === "recent") {
                                return (
                                    <SortableDashboardCard {...commonProps} key={id} title="Activity Stream">
                                        <div className="space-y-2">
                                            {recentExpenses.map((expense: any) => (
                                                <div key={expense.id} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-lg flex items-center justify-center text-sm bg-white/[0.05]">
                                                            {expense.category?.icon || "💰"}
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold leading-none mb-1">{expense.description || expense.category?.name}</p>
                                                            <p className="text-[8px] text-muted-foreground uppercase tracking-widest">{format(new Date(expense.date), "MMM dd")}</p>
                                                        </div>
                                                    </div>
                                                    <p className="font-black text-[10px]">₹{Number(expense.amount).toLocaleString()}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </SortableDashboardCard>
                                );
                            }
                            return null;
                        })}
                    </SortableContext>
                </div>
            </DndContext>
        </div>
    );
}
