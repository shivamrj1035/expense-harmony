"use client";

import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday as isDateToday, isSameMonth, differenceInMonths, differenceInWeeks } from "date-fns";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { toggleCategoryExpense } from "@/app/actions/expenses";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function CategoryTracker({ category, expenses }: { category: any, expenses: any[] }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [loadingDate, setLoadingDate] = useState<string | null>(null);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const categoryExpenses = useMemo(() => {
        return expenses.filter(e => e.categoryId === category.id && isSameMonth(new Date(e.date), currentMonth));
    }, [expenses, category.id, currentMonth]);

    const handleToggle = async (date: Date) => {
        const dateKey = format(date, "yyyy-MM-dd");
        setLoadingDate(dateKey);
        try {
            await toggleCategoryExpense(category.id, date);
            // toast.success("Updated successfully");
        } catch (error: any) {
            toast.error(error.message || "Failed to update");
        } finally {
            setLoadingDate(null);
        }
    };

    const isMarked = (date: Date) => {
        return categoryExpenses.some(e => isSameDay(new Date(e.date), date));
    };

    const shouldIncur = (date: Date) => {
        const day = date.getDay();
        const interval = category.intervalCount || 1;
        const start = new Date(category.createdAt);

        if (category.frequency === "DAILY") return true;
        if (category.frequency === "WEEKDAYS") return day >= 1 && day <= 5;

        if (category.frequency === "WEEKLY") {
            const weeksDiff = Math.abs(differenceInWeeks(date, start));
            return day === start.getDay() && weeksDiff % interval === 0;
        }

        if (category.frequency === "MONTHLY") {
            const monthsDiff = Math.abs(differenceInMonths(date, start));
            return day === start.getDate() && monthsDiff % interval === 0;
        }

        if (category.frequency === "CUSTOM") {
            const monthsDiff = Math.abs(differenceInMonths(date, start));
            return category.specificDays?.includes(day) && monthsDiff % interval === 0;
        }

        return false;
    };

    return (
        <GlassCard className="p-4 flex flex-col gap-4 overflow-hidden group">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <span className="text-xl" style={{ color: category.color }}>{category.icon}</span>
                    <h3 className="font-bold text-sm truncate max-w-[120px]">{category.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                    >
                        <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <span className="text-[10px] font-medium w-16 text-center">
                        {format(currentMonth, "MMM yyyy")}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                    >
                        <ChevronRight className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-[8px] font-bold text-muted-foreground text-center mb-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <div key={i}>{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
                {/* Empty slots for starting offset */}
                {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-6 w-6" />
                ))}

                {days.map((date) => {
                    const marked = isMarked(date);
                    const expected = shouldIncur(date);
                    const isToday = isDateToday(date);
                    const isFuture = date > new Date();
                    const dateKey = format(date, "yyyy-MM-dd");
                    const isLoading = loadingDate === dateKey;

                    const isSkipped = expected && !marked && !isFuture && !isToday;

                    return (
                        <TooltipProvider key={dateKey}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => handleToggle(date)}
                                        disabled={isLoading}
                                        className={cn(
                                            "h-9 w-9 rounded-lg flex items-center justify-center text-[11px] transition-all relative border",
                                            marked
                                                ? "bg-accent/20 border-accent text-accent shadow-[0_0_10px_rgba(var(--accent),0.2)]"
                                                : isSkipped
                                                    ? "bg-destructive/10 border-destructive/30 text-destructive/70 hover:bg-destructive/20"
                                                    : expected
                                                        ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                                                        : "bg-muted/30 border-transparent text-muted-foreground/40 hover:bg-muted/50",
                                            isToday && !marked && "ring-1 ring-primary ring-offset-1 ring-offset-background",
                                            isLoading && "animate-pulse opacity-50"
                                        )}
                                    >
                                        {format(date, "d")}

                                        {/* Price Badge */}
                                        {(marked || expected) && (
                                            <div className={cn(
                                                "absolute -top-1.5 -right-1.5 px-1 py-0.5 rounded-md text-[7px] font-bold leading-none border shadow-sm",
                                                marked
                                                    ? "bg-accent border-accent-foreground/20 text-accent-foreground"
                                                    : isSkipped
                                                        ? "bg-destructive border-destructive-foreground/20 text-destructive-foreground"
                                                        : "bg-primary border-primary-foreground/20 text-primary-foreground"
                                            )}>
                                                {category.fixedAmount}
                                            </div>
                                        )}

                                        {expected && !marked && !isFuture && <div className="absolute bottom-1 h-1 w-1 rounded-full bg-destructive animate-pulse" />}
                                        {expected && !marked && isFuture && <div className="absolute bottom-1 h-1 w-1 rounded-full bg-primary/40" />}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-[10px] py-1 px-2">
                                    <p>{format(date, "MMM dd, yyyy")}</p>
                                    <p className="font-bold">
                                        {marked ? `Ordered (₹${category.fixedAmount})` : isSkipped ? "Skipped" : expected ? "Planned" : "No expense"}
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                })}
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-[10px]">
                <div className="flex gap-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                        <span>Ordered</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                        <span>Skipped</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <span>Planned</span>
                    </div>
                </div>
                <div className="font-bold text-accent">
                    ₹{(categoryExpenses.reduce((sum, e) => sum + e.amount, 0)).toFixed(0)}
                </div>
            </div>
        </GlassCard>
    );
}
