import { useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/ui/stat-card";
import { GlassCard } from "@/components/ui/glass-card";
import { useExpenses } from "@/hooks/useExpenses";
import { useCategories } from "@/hooks/useCategories";
import {
  Wallet,
  TrendingUp,
  Receipt,
  Calendar,
  PieChart,
  ArrowUpRight,
} from "lucide-react";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import { format, startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval, startOfWeek, endOfWeek } from "date-fns";

const CHART_COLORS = [
  "hsl(271, 91%, 65%)",
  "hsl(185, 100%, 50%)",
  "hsl(142, 76%, 56%)",
  "hsl(340, 82%, 60%)",
  "hsl(45, 100%, 60%)",
  "hsl(200, 90%, 60%)",
];

export default function Dashboard() {
  const { expenses, isLoading: expensesLoading } = useExpenses();
  const { categories, isLoading: categoriesLoading } = useCategories();

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    const currentMonthExpenses = expenses.filter((e) => {
      const date = parseISO(e.date);
      return isWithinInterval(date, { start: currentMonthStart, end: currentMonthEnd });
    });

    const lastMonthExpenses = expenses.filter((e) => {
      const date = parseISO(e.date);
      return isWithinInterval(date, { start: lastMonthStart, end: lastMonthEnd });
    });

    const weekExpenses = expenses.filter((e) => {
      const date = parseISO(e.date);
      return isWithinInterval(date, { start: weekStart, end: weekEnd });
    });

    const currentTotal = currentMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const lastTotal = lastMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const weekTotal = weekExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const change = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

    return {
      currentTotal,
      lastTotal,
      weekTotal,
      change,
      transactionCount: currentMonthExpenses.length,
    };
  }, [expenses]);

  const categoryBreakdown = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    const currentMonthExpenses = expenses.filter((e) => {
      const date = parseISO(e.date);
      return isWithinInterval(date, { start: currentMonthStart, end: currentMonthEnd });
    });

    const breakdown: Record<string, { name: string; value: number; color: string }> = {};

    currentMonthExpenses.forEach((expense) => {
      const category = expense.categories;
      if (category) {
        if (!breakdown[category.id]) {
          breakdown[category.id] = {
            name: category.name,
            value: 0,
            color: category.color,
          };
        }
        breakdown[category.id].value += Number(expense.amount);
      }
    });

    return Object.values(breakdown);
  }, [expenses]);

  const dailyTrend = useMemo(() => {
    const now = new Date();
    const days: Record<string, number> = {};

    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = format(date, "MMM dd");
      days[key] = 0;
    }

    expenses.forEach((expense) => {
      const date = parseISO(expense.date);
      const key = format(date, "MMM dd");
      if (days.hasOwnProperty(key)) {
        days[key] += Number(expense.amount);
      }
    });

    return Object.entries(days).map(([date, amount]) => ({ date, amount }));
  }, [expenses]);

  const recentExpenses = useMemo(() => {
    return expenses.slice(0, 5);
  }, [expenses]);

  const isLoading = expensesLoading || categoriesLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-48 bg-muted rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
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
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">
            Welcome back! <span className="text-gradient">👋</span>
          </h1>
          <p className="text-muted-foreground">
            Here's your expense overview for {format(new Date(), "MMMM yyyy")}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="This Month"
            value={`$${stats.currentTotal.toFixed(2)}`}
            change={Math.round(stats.change)}
            trend={stats.change > 0 ? "up" : stats.change < 0 ? "down" : "neutral"}
            icon={<Wallet className="h-5 w-5" />}
          />
          <StatCard
            title="This Week"
            value={`$${stats.weekTotal.toFixed(2)}`}
            icon={<Calendar className="h-5 w-5" />}
          />
          <StatCard
            title="Transactions"
            value={stats.transactionCount}
            icon={<Receipt className="h-5 w-5" />}
          />
          <StatCard
            title="Categories"
            value={categories.length}
            icon={<PieChart className="h-5 w-5" />}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spending Trend */}
          <GlassCard>
            <h3 className="text-lg font-semibold mb-4">Spending Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrend}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(271, 91%, 65%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(271, 91%, 65%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 18%)" />
                  <XAxis
                    dataKey="date"
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
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="hsl(271, 91%, 65%)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorAmount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Category Breakdown */}
          <GlassCard>
            <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
            {categoryBreakdown.length > 0 ? (
              <div className="h-64 flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(240, 10%, 10%)",
                        border: "1px solid hsl(240, 10%, 18%)",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "Amount"]}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {categoryBreakdown.slice(0, 5).map((cat, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ background: cat.color || CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="text-muted-foreground truncate max-w-24">
                        {cat.name}
                      </span>
                      <span className="font-medium">${cat.value.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No expenses this month
              </div>
            )}
          </GlassCard>
        </div>

        {/* Recent Expenses */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Expenses</h3>
            <a
              href="/expenses"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
          {recentExpenses.length > 0 ? (
            <div className="space-y-3">
              {recentExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-lg"
                      style={{
                        background: expense.categories?.color
                          ? `${expense.categories.color}20`
                          : "hsl(var(--muted))",
                      }}
                    >
                      {expense.categories?.icon || "💰"}
                    </div>
                    <div>
                      <p className="font-medium">
                        {expense.description || expense.categories?.name || "Expense"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(expense.date), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-lg">
                    ${Number(expense.amount).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No expenses yet. Add your first expense!
            </div>
          )}
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
