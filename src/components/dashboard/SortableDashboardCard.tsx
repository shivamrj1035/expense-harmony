"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripHorizontal, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";

interface SortableDashboardCardProps {
    id: string;
    children: React.ReactNode;
    className?: string;
    title?: string;
    headerAction?: React.ReactNode;
    onResize?: (id: string, direction: "grow" | "shrink") => void;
    canGrow?: boolean;
    canShrink?: boolean;
}

export function SortableDashboardCard({
    id,
    children,
    className,
    title,
    headerAction,
    onResize,
    canGrow,
    canShrink
}: SortableDashboardCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        opacity: isDragging ? 0.6 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className={cn("h-full", className)}>
            <GlassCard className="h-full flex flex-col p-4 relative group">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <button
                            {...attributes}
                            {...listeners}
                            className="p-1 rounded-md hover:bg-white/5 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground transition-colors shrink-0"
                        >
                            <GripHorizontal className="h-4 w-4" />
                        </button>
                        {title && <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">{title}</h3>}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                        {onResize && (
                            <div className="flex items-center bg-white/5 rounded-md p-0.5 border border-white/5">
                                <button
                                    onClick={() => canShrink && onResize(id, "shrink")}
                                    disabled={!canShrink}
                                    className={cn(
                                        "p-1 rounded hover:bg-white/10 transition-colors",
                                        !canShrink ? "opacity-20 cursor-not-allowed" : "text-muted-foreground hover:text-primary"
                                    )}
                                >
                                    <Minimize2 className="h-3 w-3" />
                                </button>
                                <button
                                    onClick={() => canGrow && onResize(id, "grow")}
                                    disabled={!canGrow}
                                    className={cn(
                                        "p-1 rounded hover:bg-white/10 transition-colors",
                                        !canGrow ? "opacity-20 cursor-not-allowed" : "text-muted-foreground hover:text-primary"
                                    )}
                                >
                                    <Maximize2 className="h-3 w-3" />
                                </button>
                            </div>
                        )}
                        {headerAction}
                    </div>
                </div>
                <div className="flex-1 overflow-hidden">
                    {children}
                </div>
            </GlassCard>
        </div>
    );
}
