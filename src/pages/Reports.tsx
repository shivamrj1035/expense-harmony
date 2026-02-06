import { useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { StatCard } from "@/components/ui/stat-card";
import { useExpenses } from "@/hooks/useExpenses";
import { useCategories } from "@/hooks/useCategories";
import { BarChart, PieChart, TrendingUp, Calendar } from "lucide-react";
import {
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { format, startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval } from "date-fns";

const CHART_COLORS = [
  "hsl(271, 91%, 65%)",
  "hsl(185, 100%, 50%)",
  "hsl(142, 76%, 56%)",
  "hsl(340, 82%, 60%)",
  "hsl(45, 100%, 60%)",
];

export default function Reports() {
  const { expenses, isLoading: expensesLoading } = useExpenses();
  const { categories, isLoading: categoriesLoading } = useCategories();

  const monthlyData = useMemo(() => {
    const months: { month: string; amount: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthExpenses = expenses.filter((e) => {
        const date = parseISO(e.date);
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      });

      const total = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

      months.push({
        month: format(monthDate, "MMM"),
        amount: total,
      });
    }

    return months;
  }, [expenses]);

  const categoryStats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const currentMonthExpenses = expenses.filter((e) => {
      const date = parseISO(e.date);
      return isWithinInterval(date, { start: monthStart, end: monthEnd });
    });

    const stats: Record<string, { name: string; amount: number; color: string }> = {};

    currentMonthExpenses.forEach((expense) => {
      const category = expense.categories;
      if (category) {
        if (!stats[category.id]) {
          stats[category.id] = {
            name: category.name,
            amount: 0,
            color: category.color,
          };
        }
        stats[category.id].amount += Number(expense.amount);
      }
    });

    return Object.values(stats).sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const totalStats = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const thisMonth = expenses
      .filter((e) => {
        const date = parseISO(e.date);
        return isWithinInterval(date, { start: thisMonthStart, end: thisMonthEnd });
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const lastMonth = expenses
      .filter((e) => {
        const date = parseISO(e.date);
        return isWithinInterval(date, { start: lastMonthStart, end: lastMonthEnd });
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const average = monthlyData.reduce((sum, m) => sum + m.amount, 0) / monthlyData.length;

    const highest = categoryStats[0];

    return { thisMonth, lastMonth, average, highest };
  }, [expenses, monthlyData, categoryStats]);

  const isLoading = expensesLoading || categoriesLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-muted rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Analyze your spending patterns and trends
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="This Month"
            value={`$${totalStats.thisMonth.toFixed(2)}`}
            icon={<Calendar className="h-5 w-5" />}
          />
          <StatCard
            title="6-Month Average"
            value={`$${totalStats.average.toFixed(2)}`}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <StatCard
            title="Top Category"
            value={totalStats.highest?.name || "N/A"}
            icon={<PieChart className="h-5 w-5" />}
          />
        </div>

        {/* Monthly Trend Chart */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <BarChart className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Monthly Spending</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBar data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 18%)" />
                <XAxis
                  dataKey="month"
                  stroke="hsl(240, 5%, 65%)"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="hsl(240, 5%, 65%)"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(240, 10%, 10%)",
                    border: "1px solid hsl(240, 10%, 18%)",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Amount"]}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </RechartsBar>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Category Breakdown */}
        <GlassCard>
          <h3 className="text-lg font-semibold mb-4">Category Breakdown (This Month)</h3>
          {categoryStats.length > 0 ? (
            <div className="space-y-4">
              {categoryStats.map((cat, i) => {
                const percentage =
                  (cat.amount / totalStats.thisMonth) * 100 || 0;
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{cat.name}</span>
                      <span className="text-muted-foreground">
                        ${cat.amount.toFixed(2)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          background: cat.color || CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No expenses this month
            </div>
          )}
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
