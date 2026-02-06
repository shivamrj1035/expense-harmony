"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Edit, Power, Trash2, Mail, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableCategoryCardProps {
    category: any;
    openEdit: (category: any) => void;
    handleToggleActive: (category: any) => void;
    handleDelete: (id: string) => void;
    setReportingCategory: (category: any) => void;
    setReportDialogOpen: (open: boolean) => void;
}

export function SortableCategoryCard({
    category,
    openEdit,
    handleToggleActive,
    handleDelete,
    setReportingCategory,
    setReportDialogOpen,
}: SortableCategoryCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: category.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="h-full">
            <GlassCard
                className={cn(
                    "relative p-6 h-full flex flex-col gap-4",
                    !category.isActive && "opacity-60",
                    isDragging && "ring-2 ring-primary"
                )}
            >
                <div className="flex justify-between items-start">
                    <div className="flex gap-3 items-start">
                        <button
                            {...attributes}
                            {...listeners}
                            className="mt-4 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <GripVertical className="h-5 w-5" />
                        </button>
                        <div
                            className="h-14 w-14 rounded-xl flex items-center justify-center text-2xl shrink-0"
                            style={{ background: `${category.color}20` }}
                        >
                            {category.icon}
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(category)} className="h-8 w-8 hover:bg-background/50">
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleToggleActive(category)} className="h-8 w-8 hover:bg-background/50">
                            <Power className={`h-4 w-4 ${category.isActive ? "text-accent" : "text-muted-foreground"}`} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-xl leading-tight">{category.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase font-bold">
                            {category.trackingMode || "CALENDAR"}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {category.trackingMode === "BUDGET" ? "Monthly Budget" :
                            `${category.intervalCount > 1 ? `Every ${category.intervalCount} ` : ""}${category.frequency === "WEEKDAYS" ? "Mon-Fri" :
                                category.frequency === "CUSTOM" ? "Selected Days" :
                                    category.frequency.toLowerCase()}`}
                    </p>
                    {category.trackingMode === "BUDGET" ? (
                        <p className="text-sm font-medium text-accent">Limit: ₹{category.budgetLimit}</p>
                    ) : category.fixedAmount && (
                        <p className="text-sm font-medium text-primary">₹{category.fixedAmount}/cycle</p>
                    )}
                </div>

                <div className="mt-auto pt-2 flex items-center justify-between">
                    <div className="flex gap-2">
                        {!category.isActive && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                Inactive
                            </span>
                        )}
                    </div>
                    {category.isEmailEnabled && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                setReportingCategory(category);
                                setReportDialogOpen(true);
                            }}
                            className="h-7 px-3 text-[10px] gap-1.5 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20"
                        >
                            <Mail className="h-3 w-3" />
                            Report
                        </Button>
                    )}
                </div>
            </GlassCard>
        </div>
    );
}
