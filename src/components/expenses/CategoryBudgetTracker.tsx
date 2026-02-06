"use client";

import { useMemo } from "react";
import { format, isSameMonth } from "date-fns";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

export function CategoryBudgetTracker({ category, expenses }: { category: any, expenses: any[] }) {
    const currentMonthExpenses = useMemo(() => {
        return expenses.filter(e =>
            e.categoryId === category.id &&
            isSameMonth(new Date(e.date), new Date())
        );
    }, [expenses, category.id]);

    const totalSpent = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const limit = category.budgetLimit || 0;
    const percentage = limit > 0 ? (totalSpent / limit) * 100 : 0;
    const isOverBudget = totalSpent > limit;

    return (
        <GlassCard className="p-4 flex flex-col gap-4 overflow-hidden group h-full">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <span className="text-xl" style={{ color: category.color }}>{category.icon}</span>
                    <h3 className="font-bold text-sm truncate max-w-[120px]">{category.name}</h3>
                </div>
                <div className="text-[10px] font-medium text-muted-foreground">
                    {format(new Date(), "MMM yyyy")}
                </div>
            </div>

            <div className="flex flex-col gap-2 py-2">
                <div className="flex justify-between items-end mb-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Spending</span>
                    <span className={cn(
                        "text-xs font-bold",
                        isOverBudget ? "text-destructive" : "text-accent"
                    )}>
                        ₹{totalSpent.toFixed(0)} / ₹{limit}
                    </span>
                </div>

                <div className="h-2.5 w-full bg-muted/30 rounded-full overflow-hidden border border-border/50">
                    <div
                        className={cn(
                            "h-full transition-all duration-500",
                            isOverBudget ? "bg-destructive shadow-[0_0_10px_rgba(244,63,94,0.3)]" : "bg-gradient-to-r from-accent/50 to-accent shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                        )}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>

                <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                    <span>{percentage.toFixed(0)}% used</span>
                    {isOverBudget ? (
                        <span className="text-destructive font-bold">₹{(totalSpent - limit).toFixed(0)} over</span>
                    ) : (
                        <span>₹{(limit - totalSpent).toFixed(0)} remaining</span>
                    )}
                </div>
            </div>

            <div className="mt-auto pt-2 border-t border-border/50">
                <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Recent Activity</span>
                    <span className="font-bold text-accent">{currentMonthExpenses.length} records</span>
                </div>
            </div>
        </GlassCard>
    );
}
