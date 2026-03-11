"use client";

import { useMemo } from "react";
import { isSameMonth } from "date-fns";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Plus, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDateStore } from "@/store/useDateStore";

interface BudgetGroupCardProps {
    categories: any[];
    expenses: any[];
    onAddExpense: (categoryId: string) => void;
}

export function BudgetGroupCard({ categories, expenses, onAddExpense }: BudgetGroupCardProps) {
    const { selectedMonth } = useDateStore();
    const budgetCategories = useMemo(() =>
        categories.filter(c => c.trackingMode === "BUDGET" && c.isActive),
        [categories]);

    if (budgetCategories.length === 0) return null;

    return (
        <GlassCard className="p-4 sm:p-6 overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold">
                    <Target className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="font-bold text-lg">Budget Tracker</h3>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">{budgetCategories.length} Irregular Expenses Categories</p>
                </div>
            </div>

            <div className="md:hidden space-y-4">
                {budgetCategories.map(cat => {
                    const monthExpenses = expenses.filter(e =>
                        e.categoryId === cat.id &&
                        isSameMonth(new Date(e.date), selectedMonth)
                    );
                    const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
                    const limit = cat.budgetLimit || 0;
                    const percentage = limit > 0 ? (totalSpent / limit) * 100 : 0;
                    const isOver = totalSpent > limit;

                    return (
                        <div key={cat.id} className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3 items-center">
                                    <span className="text-2xl">{cat.icon}</span>
                                    <span className="font-semibold">{cat.name}</span>
                                </div>
                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10" onClick={() => onAddExpense(cat.id)}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className={cn("font-bold", isOver ? "text-destructive" : "text-primary")}>₹{totalSpent.toFixed(0)}</span>
                                    <span className="text-muted-foreground">/ ₹{limit.toFixed(0)}</span>
                                </div>
                                <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                                    <div
                                        className={cn("h-full transition-all duration-500", isOver ? "bg-destructive" : percentage >= 80 ? "bg-orange-500" : "bg-primary")}
                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="hidden md:block rounded-xl border border-border overflow-hidden custom-scrollbar overflow-x-auto">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[200px]">Category</TableHead>
                            <TableHead>Utilization</TableHead>
                            <TableHead className="text-right w-[150px]">Spent / Limit</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {budgetCategories.map(cat => {
                            const monthExpenses = expenses.filter(e =>
                                e.categoryId === cat.id &&
                                isSameMonth(new Date(e.date), selectedMonth)
                            );
                            const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
                            const limit = cat.budgetLimit || 0;
                            const percentage = limit > 0 ? (totalSpent / limit) * 100 : 0;
                            const isOver = totalSpent > limit;

                            return (
                                <TableRow key={cat.id} className="hover:bg-muted/30 transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">{cat.icon}</span>
                                            <span className="font-semibold">{cat.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1 w-full max-w-[300px]">
                                            <div className="flex justify-between text-[10px] font-bold">
                                                <span>{Math.min(percentage, 100).toFixed(0)}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "h-full transition-all duration-500",
                                                        isOver ? "bg-destructive" : percentage >= 80 ? "bg-orange-500" : "bg-primary"
                                                    )}
                                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right whitespace-nowrap">
                                        <span className={cn("font-bold", isOver ? "text-destructive" : "text-primary")}>₹{totalSpent.toFixed(0)}</span>
                                        <span className="text-muted-foreground text-xs ml-1">/ ₹{limit.toFixed(0)}</span>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                            onClick={() => onAddExpense(cat.id)}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </GlassCard>
    );
}
