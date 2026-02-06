import * as React from "react";
import { cn } from "@/lib/utils";
import { GlassCard } from "./glass-card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

const StatCard = ({
  title,
  value,
  change,
  icon,
  trend,
  className,
}: StatCardProps) => {
  const getTrendIcon = () => {
    if (trend === "up") return <TrendingUp className="h-4 w-4" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (trend === "up") return "text-accent";
    if (trend === "down") return "text-destructive";
    return "text-muted-foreground";
  };

  return (
    <GlassCard variant="elevated" className={cn("group", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl md:text-3xl font-bold tracking-tight">{value}</p>
          {change !== undefined && (
            <div className={cn("flex items-center gap-1 text-sm", getTrendColor())}>
              {getTrendIcon()}
              <span>{Math.abs(change)}% vs last month</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="rounded-xl bg-primary/10 p-3 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/20">
            {icon}
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export { StatCard };
