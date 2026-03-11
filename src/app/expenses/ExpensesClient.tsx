"use client";

import { useState, useMemo } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { Plus, Trash2, Edit, Receipt, Search, Mail } from "lucide-react";
import { createExpense, updateExpense, deleteExpense } from "@/app/actions/expenses";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CategoryTracker } from "@/components/expenses/CategoryTracker";
import { BudgetGroupCard } from "@/components/expenses/BudgetGroupCard";
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
import { reorderCategories } from "@/app/actions/categories";
import { useDateStore } from "@/store/useDateStore";
import { SortableExpenseCard } from "@/components/expenses/SortableExpenseCard";
import { isSameMonth } from "date-fns";

interface SortableUnit {
    id: string;
    type: "CALENDAR";
    category?: any;
}

export default function ExpensesClient({ initialExpenses, categories: initialCategories }: { initialExpenses: any[], categories: any[] }) {
    const [categories, setCategories] = useState(initialCategories);
    const [isOpen, setIsOpen] = useState(false);
    const { selectedMonth } = useDateStore();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const sortableUnits = useMemo<SortableUnit[]>(() => {
        const units: SortableUnit[] = [];
        categories.forEach(cat => {
            if (cat.isActive && cat.trackingMode === "CALENDAR" && cat.fixedAmount) {
                units.push({ id: cat.id, type: "CALENDAR", category: cat });
            }
        });
        return units;
    }, [categories]);

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = sortableUnits.findIndex(u => u.id === active.id);
            const newIndex = sortableUnits.findIndex(u => u.id === over.id);
            const newUnits = arrayMove(sortableUnits, oldIndex, newIndex);

            const budgetCats = categories.filter(c => c.trackingMode === "BUDGET");
            const inactiveCats = categories.filter(c => !c.isActive || (c.trackingMode === "CALENDAR" && !c.fixedAmount));

            const finalOrder: any[] = [...budgetCats, ...newUnits.map(u => u.category), ...inactiveCats];

            setCategories(finalOrder);
            try {
                await reorderCategories(finalOrder.map(c => c.id));
                toast.success("Order updated");
            } catch {
                toast.error("Failed to save order");
                setCategories(categories);
            }
        }
    };
    const [editingExpense, setEditingExpense] = useState<any | null>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("date-desc");
    const [filterCategory, setFilterCategory] = useState("all");
    const [formData, setFormData] = useState<any>({
        categoryId: "",
        amount: "",
        date: format(new Date(), "yyyy-MM-dd"),
        description: "",
    });

    const filteredExpenses = useMemo(() => {
        let result = initialExpenses.filter((e) => {
            const matchesSearch = (e.description?.toLowerCase() || e.category?.name.toLowerCase()).includes(search.toLowerCase());
            const matchesMonth = isSameMonth(new Date(e.date), selectedMonth);
            return matchesSearch && matchesMonth;
        });

        if (filterCategory !== "all") {
            result = result.filter(e => e.categoryId === filterCategory);
        }

        result = result.sort((a, b) => {
            if (sortBy === "date-desc") return new Date(b.date).getTime() - new Date(a.date).getTime();
            if (sortBy === "date-asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
            if (sortBy === "amount-desc") return b.amount - a.amount;
            if (sortBy === "amount-asc") return a.amount - b.amount;
            return 0;
        });

        return result;
    }, [initialExpenses, search, filterCategory, sortBy, selectedMonth]);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                amount: parseFloat(formData.amount),
            };

            if (editingExpense) {
                await updateExpense(editingExpense.id, payload);
                toast.success("Expense updated");
            } else {
                await createExpense(payload);
                toast.success("Expense added");
            }
            setIsOpen(false);
            setEditingExpense(null);
            resetForm();
        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            categoryId: "",
            amount: "",
            date: format(new Date(), "yyyy-MM-dd"),
            description: "",
        });
    };

    const openEdit = (expense: any) => {
        setEditingExpense(expense);
        setFormData({
            categoryId: expense.categoryId,
            amount: expense.amount.toString(),
            date: format(new Date(expense.date), "yyyy-MM-dd"),
            description: expense.description || "",
        });
        setIsOpen(true);
    };

    const handleDelete = async () => {
        if (!expenseToDelete) return;
        try {
            await deleteExpense(expenseToDelete);
            toast.success("Expense deleted");
            setExpenseToDelete(null);
        } catch (error) {
            toast.error("Failed to delete expense");
        }
    };

    const handleQuickAddExpense = (categoryId: string) => {
        setFormData({
            ...formData,
            categoryId,
            date: format(new Date(), "yyyy-MM-dd"),
        });
        setIsOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Expenses</h1>
                    <p className="text-muted-foreground">Track and manage your daily spending</p>
                </div>
                <Dialog
                    open={isOpen}
                    onOpenChange={(open) => {
                        setIsOpen(open);
                        if (!open) {
                            setEditingExpense(null);
                            resetForm();
                        }
                    }}
                >
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-primary hover:opacity-90 glow-primary gap-2">
                            <Plus className="h-4 w-4" />
                            Add Expense
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-card border-border sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{editingExpense ? "Edit Expense" : "Add Expense"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select
                                    value={formData.categoryId}
                                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                                    required
                                >
                                    <SelectTrigger className="bg-background/50">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.icon} {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Amount</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="bg-background/50"
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="bg-background/50"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Description (optional)</Label>
                                <Input
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="bg-background/50"
                                    placeholder="What was this for?"
                                />
                            </div>

                            <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 mt-4" disabled={loading}>
                                {loading ? "Saving..." : editingExpense ? "Update Expense" : "Add Expense"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Category Tracking Calendars */}
            {sortableUnits.length > 0 && (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToFirstScrollableAncestor]}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <SortableContext
                            items={sortableUnits.map(u => u.id)}
                            strategy={rectSortingStrategy}
                        >
                            {sortableUnits.map(unit => (
                                <SortableExpenseCard key={unit.id} id={unit.id}>
                                    <CategoryTracker
                                        category={unit.category}
                                        expenses={initialExpenses}
                                    />
                                </SortableExpenseCard>
                            ))}
                        </SortableContext>
                    </div>
                </DndContext>
            )}

            <BudgetGroupCard categories={categories} expenses={initialExpenses} onAddExpense={handleQuickAddExpense} />

            <GlassCard className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center gap-2 mb-6">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search expenses..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 bg-background/50 border-border"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                            <SelectTrigger className="w-full sm:w-[150px] bg-background/50">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map(c => (
                                    <SelectItem key={c.id} value={c.id}>
                                        <span className="flex items-center gap-2">
                                            <span>{c.icon}</span> <span className="truncate">{c.name}</span>
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-full sm:w-[150px] bg-background/50">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="date-desc">Newest First</SelectItem>
                                <SelectItem value="date-asc">Oldest First</SelectItem>
                                <SelectItem value="amount-desc">Highest Amount</SelectItem>
                                <SelectItem value="amount-asc">Lowest Amount</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {filteredExpenses.length > 0 ? (
                    <>
                        <div className="md:hidden overflow-y-auto custom-scrollbar pr-2 h-[400px] resize-y overflow-hidden border border-border/20 rounded-xl p-2 bg-background/20">
                            <div className="space-y-4">
                                {filteredExpenses.map((expense) => (
                                    <div key={expense.id} className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-3">
                                                <div
                                                    className="h-10 w-10 rounded-lg flex items-center justify-center text-lg hover:scale-105 transition-transform"
                                                    style={{ background: `${expense.category?.color}20` }}
                                                >
                                                    {expense.category?.icon || "💰"}
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{expense.description || "No description"}</p>
                                                    <p className="text-xs text-muted-foreground">{format(new Date(expense.date), "MMM dd, yyyy")}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(expense)} className="h-8 w-8 hover:bg-white/10 hover:text-white">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setExpenseToDelete(expense.id)} className="h-8 w-8 text-destructive hover:bg-destructive/20 hover:text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-border/50">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-muted-foreground">{expense.category?.name}</span>
                                                {expense.category?.fixedAmount && (
                                                    <span className="text-[10px] text-accent font-medium">Ordered Tracker</span>
                                                )}
                                            </div>
                                            <span className={cn(
                                                "font-bold text-lg",
                                                expense.category?.fixedAmount ? "text-accent" : "text-primary"
                                            )}>₹{expense.amount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="hidden md:block rounded-xl border border-border overflow-hidden custom-scrollbar overflow-y-auto h-[400px] resize-y pr-2">
                            <Table>
                                <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead className="w-[150px]">Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="w-[100px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredExpenses.map((expense) => (
                                        <TableRow key={expense.id} className="hover:bg-muted/30 transition-colors group">
                                            <TableCell className="font-medium text-muted-foreground">
                                                {format(new Date(expense.date), "MMM dd, yyyy")}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">{expense.description || "No description"}</span>
                                                    {expense.isAutoGenerated && (
                                                        <span className="text-[10px] text-primary">Auto-generated</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="h-6 w-6 rounded flex items-center justify-center text-xs" style={{ background: `${expense.category?.color}20`, color: expense.category?.color || 'inherit' }}>
                                                        {expense.category?.icon}
                                                    </span>
                                                    {expense.category?.name}
                                                </div>
                                            </TableCell>
                                            <TableCell className={cn(
                                                "text-right font-bold text-lg",
                                                expense.category?.fixedAmount ? "text-accent" : "text-primary"
                                            )}>
                                                ₹{expense.amount.toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(expense)} className="h-8 w-8">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => setExpenseToDelete(expense.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed rounded-xl">
                        <Receipt className="h-12 w-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium">No expenses found</p>
                        <p className="text-sm">Try adding your first expense or adjust your search</p>
                    </div>
                )}
            </GlassCard>

            {/* Custom UI Delete Alert */}
            <AlertDialog open={!!expenseToDelete} onOpenChange={(open) => {
                if (!open) setExpenseToDelete(null);
            }}>
                <AlertDialogContent className="glass-card border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this expense from your records.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
