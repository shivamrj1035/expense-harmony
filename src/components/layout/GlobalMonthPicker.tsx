"use client";

import { useDateStore } from "@/store/useDateStore";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function GlobalMonthPicker() {
    const { selectedMonth, setSelectedMonth } = useDateStore();
    const [isOpen, setIsOpen] = useState(false);

    const handlePrevMonth = () => setSelectedMonth(subMonths(selectedMonth, 1));
    const handleNextMonth = () => setSelectedMonth(addMonths(selectedMonth, 1));
    
    // Quick jumps
    const currentYear = new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => new Date(currentYear, i, 1));

    return (
        <div className="flex items-center gap-1 bg-background/50 backdrop-blur-md border border-border/50 rounded-full px-1 py-1 shadow-sm">
            <Button 
                variant="ghost" 
                size="icon" 
                className="hidden md:flex h-8 w-8 rounded-full hover:bg-primary/20 hover:text-primary transition-colors" 
                onClick={handlePrevMonth}
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button 
                        variant="ghost" 
                        className="h-8 px-2 md:px-3 font-semibold text-sm hover:bg-primary/10 hover:text-primary transition-colors gap-2"
                    >
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        <span className="hidden md:inline-block min-w-[100px] text-center">{format(selectedMonth, "MMMM yyyy")}</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 glass-card border-border" align="center">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                        <span className="font-semibold text-sm">Select Month</span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10px] bg-primary/20 text-primary border-primary/30"
                            onClick={() => {
                                setSelectedMonth(new Date());
                                setIsOpen(false);
                            }}
                        >
                            Current
                        </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {months.map((month) => {
                            const isSelected = selectedMonth.getMonth() === month.getMonth() && selectedMonth.getFullYear() === month.getFullYear();
                            return (
                                <Button
                                    key={month.getMonth()}
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "h-9 text-xs transition-all",
                                        isSelected 
                                            ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(124,58,237,0.5)] hover:bg-primary" 
                                            : "hover:bg-primary/20 hover:text-primary"
                                    )}
                                    onClick={() => {
                                        setSelectedMonth(new Date(selectedMonth.getFullYear(), month.getMonth(), 1));
                                        setIsOpen(false);
                                    }}
                                >
                                    {format(month, "MMM")}
                                </Button>
                            );
                        })}
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear() - 1, selectedMonth.getMonth(), 1))}
                        >
                            <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <span className="text-xs font-bold text-muted-foreground">{selectedMonth.getFullYear()}</span>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear() + 1, selectedMonth.getMonth(), 1))}
                        >
                            <ChevronRight className="h-3 w-3" />
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>

            <Button 
                variant="ghost" 
                size="icon" 
                className="hidden md:flex h-8 w-8 rounded-full hover:bg-primary/20 hover:text-primary transition-colors" 
                onClick={handleNextMonth}
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
}
