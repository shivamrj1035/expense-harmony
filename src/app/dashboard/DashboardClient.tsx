"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { GlassCard } from "@/components/ui/glass-card";
import {
    Wallet,
    Receipt,
    Calendar,
    PieChart,
    ArrowUpRight,
    TrendingUp,
    Send,
    Download,
    Mail,
    Loader2
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
import { sendMonthlyAnalysisReport } from "@/app/actions/hub-reports";
import { toast } from "sonner";

const CHART_COLORS = [
    "#7c3aed",
    "#0ea5e9",
    "#10b981",
    "#db2777",
    "#f59e0b",
    "#3b82f6",
];

import {
    BarChart as RechartsBar,
    Bar,
} from "recharts";

export default function DashboardClient({ expenses, categories }: any) {
    const [widgets, setWidgets] = useState(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("dashboard-config-v4");
            if (saved) return JSON.parse(saved);
        }
        return [
            { id: "stats", size: 6 },
            { id: "trend", size: 3 },
            { id: "history", size: 3 },
            { id: "breakdown-pie", size: 3 },
            { id: "breakdown-detailed", size: 3 },
            { id: "recent", size: 6 },
        ];
    });

    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [reportMonth, setReportMonth] = useState(format(new Date(), "yyyy-MM"));
    const [sendingReport, setSendingReport] = useState(false);

    const handleSendHubReport = async () => {
        setSendingReport(true);
        try {
            await sendMonthlyAnalysisReport(reportMonth);
            toast.success(`Analysis report for ${format(new Date(reportMonth + "-02"), "MMMM yyyy")} sent!`);
            setReportDialogOpen(false);
        } catch (error) {
            console.error("Report error:", error);
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
        const weekStart = startOfWeek(now);
        const weekEnd = endOfWeek(now);

        const currentMonthExpenses = expenses.filter((e: any) => {
            const date = new Date(e.date);
            return isWithinInterval(date, { start: currentMonthStart, end: currentMonthEnd });
        });

        const lastMonthExpenses = expenses.filter((e: any) => {
            const date = new Date(e.date);
            return isWithinInterval(date, { start: lastMonthStart, end: lastMonthEnd });
        });

        const weekExpenses = expenses.filter((e: any) => {
            const date = new Date(e.date);
            return isWithinInterval(date, { start: weekStart, end: weekEnd });
        });

        const currentTotal = currentMonthExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
        const lastTotal = lastMonthExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
        const weekTotal = weekExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

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

        const averageTotal = monthlyData.reduce((sum, m) => sum + m.amount, 0) / monthlyData.length;
        const change = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

        // Category Breakdown for Reports summary
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
            weekTotal,
            averageTotal,
            change,
            transactionCount: currentMonthExpenses.length,
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
                    <h1 className="text-2xl font-bold tracking-tight">
                        Analytics Hub
                    </h1>
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
                                    We will generate a high-fidelity analysis of your spending for the selected month and send it directly to your email. The mail will include a link to download the full PDF ledger.
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
                                    {sendingReport ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generating Insights...
                                        </>
                                    ) : (
                                        "Dispatch Report"
                                    )}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToFirstScrollableAncestor]}
            >
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
                    <SortableContext
                        items={widgets.map(w => w.id)}
                        strategy={rectSortingStrategy}
                    >
                        {widgets.map((widget: any) => {
                            const { id, size } = widget;
                            const commonProps = {
                                id,
                                className: getColSpan(size),
                                onResize: handleResize,
                                canGrow: size < 6,
                                canShrink: size > 2
                            };

                            if (id === "stats") {
                                return (
                                    <SortableDashboardCard
                                        {...commonProps}
                                        key={id}
                                        title="Financial Performance"
                                        headerAction={
                                            <Link href="/expenses" className="text-[10px] text-primary hover:underline flex items-center gap-1 font-bold bg-primary/10 px-2 py-0.5 rounded-full">
                                                GO TO TRACKER <ArrowUpRight className="h-2.5 w-2.5" />
                                            </Link>
                                        }
                                    >
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Month Burn</p>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xl font-black">₹{stats.currentTotal.toFixed(0)}</p>
                                                    <div className={cn("text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1", stats.change <= 0 ? "bg-accent/20 text-accent font-bold" : "bg-destructive/20 text-destructive font-bold")}>
                                                        {stats.change <= 0 ? <TrendingUp className="h-2.5 w-2.5 rotate-180" /> : <TrendingUp className="h-2.5 w-2.5" />}
                                                        {Math.abs(stats.change).toFixed(0)}%
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Top Category</p>
                                                <p className="text-xl font-black truncate">{stats.topCategory?.name || "N/A"}</p>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Mo Average</p>
                                                <p className="text-xl font-black">₹{stats.averageTotal.toFixed(0)}</p>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Scope</p>
                                                <p className="text-xl font-black">{categories.length} <span className="text-xs text-muted-foreground font-normal">CATS</span></p>
                                            </div>
                                        </div>
                                    </SortableDashboardCard>
                                );
                            }

                            if (id === "trend") {
                                return (
                                    <SortableDashboardCard {...commonProps} key={id} title="Spending Velocity (14D)">
                                        <div className="h-64 mt-2">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={dailyTrend}>
                                                    <defs>
                                                        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} tickFormatter={(v) => `₹${v}`} />
                                                    <Tooltip
                                                        contentStyle={{ background: "rgba(15, 15, 20, 0.95)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "16px", fontSize: "11px", fontWeight: "bold", color: "#fff" }}
                                                        itemStyle={{ color: "#fff" }}
                                                        labelStyle={{ color: "rgba(255,255,255,0.5)" }}
                                                        cursor={{ stroke: '#7c3aed', strokeWidth: 1.5 }}
                                                    />
                                                    <Area type="monotone" dataKey="amount" stroke="#7c3aed" strokeWidth={3} fillOpacity={1} fill="url(#trendGradient)" animationDuration={1000} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </SortableDashboardCard>
                                );
                            }

                            if (id === "history") {
                                return (
                                    <SortableDashboardCard {...commonProps} key={id} title="6-Month Pulse">
                                        <div className="h-64 mt-2">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RechartsBar data={stats.monthlyData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} tickFormatter={(v) => `₹${v}`} />
                                                    <Tooltip
                                                        contentStyle={{ background: "rgba(15, 15, 20, 0.95)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", fontSize: "11px", color: "#fff" }}
                                                        itemStyle={{ color: "#fff" }}
                                                        labelStyle={{ color: "rgba(255,255,255,0.5)" }}
                                                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                                    />
                                                    <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                                                        {stats.monthlyData.map((_: any, index: number) => (
                                                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} fillOpacity={0.8} />
                                                        ))}
                                                    </Bar>
                                                </RechartsBar>
                                            </ResponsiveContainer>
                                        </div>
                                    </SortableDashboardCard>
                                );
                            }

                            if (id === "breakdown-pie") {
                                return (
                                    <SortableDashboardCard {...commonProps} key={id} title="Visual Breakdown">
                                        <div className="h-64 flex flex-col justify-center items-center relative">
                                            <div className="h-48 w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RechartsPie>
                                                        <Pie
                                                            data={stats.categoryStats}
                                                            innerRadius={50}
                                                            outerRadius={80}
                                                            paddingAngle={4}
                                                            dataKey="amount"
                                                            stroke="none"
                                                        >
                                                            {stats.categoryStats.map((entry: any, index: number) => (
                                                                <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            contentStyle={{ background: "rgba(15, 15, 20, 0.98)", border: "none", borderRadius: "12px", fontSize: "11px", color: "#fff" }}
                                                            itemStyle={{ color: "#fff" }}
                                                        />
                                                    </RechartsPie>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="absolute top-[45%] flex flex-col items-center pointer-events-none">
                                                <span className="text-[10px] text-muted-foreground uppercase font-bold opacity-50">Total</span>
                                                <span className="text-sm font-black tracking-tight">₹{stats.currentTotal.toFixed(0)}</span>
                                            </div>
                                        </div>
                                    </SortableDashboardCard>
                                );
                            }

                            if (id === "breakdown-detailed") {
                                return (
                                    <SortableDashboardCard {...commonProps} key={id} title="Category Utilization">
                                        <div className="h-64 overflow-y-auto custom-scrollbar px-1 space-y-4 py-2">
                                            {stats.categoryStats.length > 0 ? stats.categoryStats.map((cat, i) => {
                                                const percentage = (cat.amount / stats.currentTotal) * 100 || 0;
                                                return (
                                                    <div key={i} className="space-y-1.5">
                                                        <div className="flex justify-between text-[11px] font-bold">
                                                            <span className="text-muted-foreground uppercase tracking-tight">{cat.name}</span>
                                                            <span>₹{cat.amount.toFixed(0)} <span className="text-muted-foreground font-normal ml-0.5">({percentage.toFixed(0)}%)</span></span>
                                                        </div>
                                                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                                                style={{
                                                                    width: `${percentage}%`,
                                                                    background: cat.color || CHART_COLORS[i % CHART_COLORS.length],
                                                                    boxShadow: `0 0 10px ${cat.color || CHART_COLORS[i % CHART_COLORS.length]}20`
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            }) : (
                                                <div className="h-full flex items-center justify-center text-[11px] italic text-muted-foreground opacity-50">
                                                    No deployment data for current cycle
                                                </div>
                                            )}
                                        </div>
                                    </SortableDashboardCard>
                                );
                            }

                            if (id === "recent") {
                                return (
                                    <SortableDashboardCard {...commonProps} key={id} title="Activity Stream">
                                        <div className="space-y-2 mt-2">
                                            {recentExpenses.length > 0 ? recentExpenses.map((expense: any) => (
                                                <div key={expense.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all hover:bg-white/[0.05]">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-xl flex items-center justify-center text-lg shadow-inner" style={{ background: expense.category?.color ? `${expense.category.color}20` : "rgba(255,255,255,0.05)" }}>
                                                            {expense.category?.icon || "💰"}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold leading-none mb-1">{expense.description || expense.category?.name || "Expense"}</p>
                                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">
                                                                {expense.category?.name} • {format(new Date(expense.date), "MMM dd")}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <p className="font-black text-xs bg-white/5 px-3 py-1 rounded-lg">₹{Number(expense.amount).toFixed(0)}</p>
                                                </div>
                                            )) : (
                                                <div className="text-center py-6 text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold italic opacity-30">Null records retrieved</div>
                                            )}
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

