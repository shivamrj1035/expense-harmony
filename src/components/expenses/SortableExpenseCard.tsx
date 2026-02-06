"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableExpenseCardProps {
    id: string;
    children: React.ReactNode;
}

export function SortableExpenseCard({ id, children }: SortableExpenseCardProps) {
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
        <div ref={setNodeRef} style={style} className="relative group h-full">
            <button
                {...attributes}
                {...listeners}
                className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-background/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all cursor-grab active:cursor-grabbing hover:bg-background/40"
            >
                <GripHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
            {children}
        </div>
    );
}
