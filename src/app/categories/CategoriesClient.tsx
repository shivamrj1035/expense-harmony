"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Trash2, Edit, FolderOpen, Power, Mail, Calendar } from "lucide-react";
import { createCategory, updateCategory, deleteCategory, reorderCategories } from "@/app/actions/categories";
import { sendCategoryReport } from "@/app/actions/reports";
import { toast } from "sonner";
import { format } from "date-fns";
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
    verticalListSortingStrategy,
    rectSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableCategoryCard } from "@/components/categories/SortableCategoryCard";
import { restrictToFirstScrollableAncestor } from "@dnd-kit/modifiers";

const CATEGORY_ICONS = ["💰", "🏠", "⛽", "🍽️", "🎮", "💼", "🛒", "🎓", "💊", "✈️", "🎬", "📱"];
const CATEGORY_COLORS = [
    "#8B5CF6",
    "#06B6D4",
    "#10B981",
    "#F43F5E",
    "#F59E0B",
    "#EC4899",
    "#3B82F6",
    "#6366F1",
];

const FREQUENCY_OPTIONS = [
    { value: "DAILY", label: "Daily" },
    { value: "WEEKDAYS", label: "Mon-Fri" },
    { value: "WEEKLY", label: "Weekly" },
    { value: "MONTHLY", label: "Monthly" },
    { value: "CUSTOM", label: "Selected Days" },
];

const DAYS_OF_WEEK = [
    { value: 0, label: "S" },
    { value: 1, label: "M" },
    { value: 2, label: "T" },
    { value: 3, label: "W" },
    { value: 4, label: "T" },
    { value: 5, label: "F" },
    { value: 6, label: "S" },
];

export default function CategoriesClient({ initialCategories }: { initialCategories: any[] }) {
    const [categories, setCategories] = useState(initialCategories);
    const [isOpen, setIsOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    const [formData, setFormData] = useState<any>({
        name: "",
        icon: "💰",
        color: "#8B5CF6",
        trackingMode: "CALENDAR",
        frequency: "MONTHLY",
        intervalCount: 1,
        specificDays: [],
        fixedAmount: "",
        budgetLimit: "",
        isEmailEnabled: true,
    });

    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [reportingCategory, setReportingCategory] = useState<any | null>(null);
    const [sendingReport, setSendingReport] = useState(false);
    const [reportMonth, setReportMonth] = useState(format(new Date(), "yyyy-MM"));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                fixedAmount: formData.fixedAmount ? parseFloat(formData.fixedAmount) : null,
                budgetLimit: formData.budgetLimit ? parseFloat(formData.budgetLimit) : null,
                intervalCount: parseInt(formData.intervalCount) || 1,
            };

            if (editingCategory) {
                await updateCategory(editingCategory.id, payload);
                toast.success("Category updated");
            } else {
                await createCategory(payload);
                toast.success("Category created");
            }
            setIsOpen(false);
            setEditingCategory(null);
            resetForm();
        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            icon: "💰",
            color: "#8B5CF6",
            trackingMode: "CALENDAR",
            frequency: "MONTHLY",
            intervalCount: 1,
            specificDays: [],
            fixedAmount: "",
            budgetLimit: "",
            isEmailEnabled: true,
        });
    };

    const openEdit = (category: any) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            icon: category.icon,
            color: category.color,
            trackingMode: category.trackingMode || "CALENDAR",
            frequency: category.frequency,
            intervalCount: category.intervalCount || 1,
            specificDays: category.specificDays || [],
            fixedAmount: category.fixedAmount?.toString() || "",
            budgetLimit: category.budgetLimit?.toString() || "",
            isEmailEnabled: category.isEmailEnabled,
        });
        setIsOpen(true);
    };

    const handleToggleActive = async (category: any) => {
        try {
            await updateCategory(category.id, { isActive: !category.isActive });
            toast.success(`Category ${category.isActive ? "deactivated" : "activated"}`);
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This will delete all associated expenses.")) return;
        try {
            await deleteCategory(id);
            toast.success("Category deleted");
        } catch (error) {
            toast.error("Failed to delete category");
        }
    };

    const handleSendReport = async () => {
        if (!reportingCategory) return;
        setSendingReport(true);
        try {
            await sendCategoryReport(reportingCategory.id, new Date(reportMonth));
            toast.success(`Report for ${reportingCategory.name} sent to your email`);
            setReportDialogOpen(false);
        } catch (error) {
            toast.error("Failed to send report");
        } finally {
            setSendingReport(false);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = categories.findIndex((c) => c.id === active.id);
            const newIndex = categories.findIndex((c) => c.id === over.id);

            const newOrder = arrayMove(categories, oldIndex, newIndex);
            setCategories(newOrder);

            try {
                await reorderCategories(newOrder.map((c) => c.id));
                toast.success("Order updated");
            } catch (error) {
                toast.error("Failed to save order");
                setCategories(categories);
            }
        }
    };

    // Keep state in sync with props
    useState(() => {
        setCategories(initialCategories);
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Categories</h1>
                    <p className="text-muted-foreground">Organize your expenses with custom categories</p>
                </div>
                <Dialog
                    open={isOpen}
                    onOpenChange={(open) => {
                        setIsOpen(open);
                        if (!open) {
                            setEditingCategory(null);
                            resetForm();
                        }
                    }}
                >
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-primary hover:opacity-90 glow-primary gap-2">
                            <Plus className="h-4 w-4" />
                            Add Category
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-card border-border max-h-[90vh] overflow-y-auto sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{editingCategory ? "Edit Category" : "Create Category"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>Tracking Mode</Label>
                                <Select
                                    value={formData.trackingMode}
                                    onValueChange={(value) => setFormData({ ...formData, trackingMode: value })}
                                >
                                    <SelectTrigger className="bg-background/50">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CALENDAR">Calendar (Fixed Days)</SelectItem>
                                        <SelectItem value="BUDGET">Budget (Variable/Irregular)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="bg-background/50"
                                    placeholder="e.g., Groceries, Fuel"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Icon</Label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORY_ICONS.map((icon) => (
                                        <button
                                            key={icon}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, icon })}
                                            className={`h-10 w-10 rounded-lg text-xl flex items-center justify-center transition-all ${formData.icon === icon
                                                ? "bg-primary/20 ring-2 ring-primary"
                                                : "bg-muted hover:bg-muted/80"
                                                }`}
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </div>



                            {formData.trackingMode === "CALENDAR" && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Frequency</Label>
                                            <Select
                                                value={formData.frequency}
                                                onValueChange={(value) => {
                                                    const updates: any = { frequency: value };
                                                    if (value === "WEEKDAYS") updates.specificDays = [1, 2, 3, 4, 5];
                                                    setFormData({ ...formData, ...updates });
                                                }}
                                            >
                                                <SelectTrigger className="bg-background/50">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {FREQUENCY_OPTIONS.map((opt) => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Every N {formData.frequency === "WEEKLY" ? "Week(s)" : "Month(s)"}</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={formData.intervalCount}
                                                onChange={(e) => setFormData({ ...formData, intervalCount: e.target.value })}
                                                className="bg-background/50"
                                                disabled={formData.frequency === "DAILY" || formData.frequency === "WEEKDAYS"}
                                            />
                                        </div>
                                    </div>

                                    {formData.frequency === "CUSTOM" && (
                                        <div className="space-y-2">
                                            <Label>Select Days</Label>
                                            <div className="flex gap-1.5">
                                                {DAYS_OF_WEEK.map((day) => (
                                                    <button
                                                        key={day.value}
                                                        type="button"
                                                        onClick={() => {
                                                            const days = formData.specificDays.includes(day.value)
                                                                ? formData.specificDays.filter((d: number) => d !== day.value)
                                                                : [...formData.specificDays, day.value];
                                                            setFormData({ ...formData, specificDays: days });
                                                        }}
                                                        className={`h-9 w-9 rounded-full text-xs font-semibold flex items-center justify-center transition-all ${formData.specificDays.includes(day.value)
                                                            ? "bg-primary text-primary-foreground"
                                                            : "bg-muted hover:bg-muted/80"
                                                            }`}
                                                    >
                                                        {day.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label>Fixed Amount per Cycle</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.fixedAmount}
                                            onChange={(e) => setFormData({ ...formData, fixedAmount: e.target.value })}
                                            className="bg-background/50"
                                            placeholder="₹ 0.00"
                                        />
                                    </div>
                                </>
                            )}

                            {formData.trackingMode === "BUDGET" && (
                                <div className="space-y-2">
                                    <Label>Monthly Budget Limit</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.budgetLimit}
                                        onChange={(e) => setFormData({ ...formData, budgetLimit: e.target.value })}
                                        className="bg-background/50"
                                        placeholder="e.g., 5000"
                                        required
                                    />
                                    <p className="text-[10px] text-muted-foreground">For irregular expenses like Fuel or Shopping where you want to track a total limit.</p>
                                </div>
                            )}

                            <div className="flex items-center justify-between rounded-lg bg-muted/30 p-4">
                                <div>
                                    <p className="font-medium text-sm">Email Reports</p>
                                    <p className="text-xs text-muted-foreground">Include in periodic reports</p>
                                </div>
                                <Switch
                                    checked={formData.isEmailEnabled}
                                    onCheckedChange={(checked) => setFormData({ ...formData, isEmailEnabled: checked })}
                                />
                            </div>

                            <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 mt-4" disabled={loading}>
                                {loading ? "Saving..." : editingCategory ? "Update Category" : "Create Category"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                    <DialogContent className="glass-card border-border sm:max-w-[400px]">
                        <DialogHeader>
                            <DialogTitle>Send Category Report</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <p className="text-sm text-muted-foreground">
                                Select the month for which you want to receive a detailed calendar report for <strong>{reportingCategory?.name}</strong>.
                            </p>
                            <div className="space-y-2">
                                <Label>Select Month</Label>
                                <Input
                                    type="month"
                                    value={reportMonth}
                                    onChange={(e) => setReportMonth(e.target.value)}
                                    className="bg-background/50"
                                />
                            </div>
                            <Button
                                onClick={handleSendReport}
                                className="w-full bg-gradient-primary hover:opacity-90"
                                disabled={sendingReport}
                            >
                                {sendingReport ? "Sending..." : "Send to Email"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToFirstScrollableAncestor]}
            >
                {categories.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <SortableContext
                            items={categories.map((c) => c.id)}
                            strategy={rectSortingStrategy}
                        >
                            {categories.map((category) => (
                                <SortableCategoryCard
                                    key={category.id}
                                    category={category}
                                    openEdit={openEdit}
                                    handleToggleActive={handleToggleActive}
                                    handleDelete={handleDelete}
                                    setReportingCategory={setReportingCategory}
                                    setReportDialogOpen={setReportDialogOpen}
                                />
                            ))}
                        </SortableContext>
                    </div>
                ) : (
                    <GlassCard className="flex flex-col items-center justify-center py-20 border-dashed">
                        <FolderOpen className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                        <p className="text-lg font-medium text-muted-foreground">No categories yet</p>
                        <p className="text-sm text-muted-foreground">Create your first category to organize expenses</p>
                    </GlassCard>
                )}
            </DndContext>
        </div>
    );
}
