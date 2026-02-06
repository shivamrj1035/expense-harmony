"use client";

import { useMemo } from "react";
import { format, isSameMonth } from "date-fns";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BudgetGroupCardProps {
    categories: any[];
    expenses: any[];
    onAddExpense: (categoryId: string) => void;
}

export function BudgetGroupCard({ categories, expenses, onAddExpense }: BudgetGroupCardProps) {
    const budgetCategories = useMemo(() =>
        categories.filter(c => c.trackingMode === "BUDGET" && c.isActive),
        [categories]);

    if (budgetCategories.length === 0) return null;

    return (
        <GlassCard className="p-0 overflow-hidden flex flex-col min-h-fit border-primary/20 bg-primary/5">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold">
                        B
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">Budget Group</h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Irregular Expenses</p>
                    </div>
                </div>
                <div className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                    {budgetCategories.length} CATEGORIES
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 max-h-[210px]">
                {budgetCategories.map(cat => {
                    const monthExpenses = expenses.filter(e =>
                        e.categoryId === cat.id &&
                        isSameMonth(new Date(e.date), new Date())
                    );
                    const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
                    const limit = cat.budgetLimit || 0;
                    const percentage = limit > 0 ? (totalSpent / limit) * 100 : 0;
                    const isOver = totalSpent > limit;

                    return (
                        <div key={cat.id} className="p-3 rounded-xl bg-background/40 border border-white/5 space-y-2 group transition-all hover:bg-background/60">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{cat.icon}</span>
                                    <span className="text-sm font-semibold">{cat.name}</span>
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => onAddExpense(cat.id)}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-muted-foreground">Spent ₹{totalSpent.toFixed(0)}</span>
                                    <span className={cn(
                                        "font-bold",
                                        isOver ? "text-destructive" : "text-primary"
                                    )}>Limit ₹{limit.toFixed(0)}</span>
                                </div>
                                <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full transition-all duration-500",
                                            isOver ? "bg-destructive" : "bg-primary"
                                        )}
                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="p-3 bg-white/5 border-t border-white/10 mt-auto">
                <p className="text-[9px] text-muted-foreground text-center italic">
                    Categories with BUDGET tracking mode are consolidated here.
                </p>
            </div>
        </GlassCard>
    );
}
