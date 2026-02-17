import { DashboardLayout } from "@/components/layout/DashboardLayout";
import DashboardClient from "./DashboardClient";
import { getExpenses } from "@/app/actions/expenses";
import { getCategories } from "@/app/actions/categories";
import { getStocks } from "@/app/actions/stocks";
import { getMutualFunds } from "@/app/actions/mutual-funds";
import { syncUser } from "@/app/actions/user";
import { redirect } from "next/navigation";

export default async function DashboardPage({ searchParams }: { searchParams: { refresh?: string } }) {
    const user = await syncUser();

    if (!user) {
        redirect("/auth");
    }

    const expenses = await getExpenses();
    const categories = await getCategories();
    const forceRefresh = searchParams.refresh === "true";
    const stocks = user.showStocksInSummary ? await getStocks(forceRefresh) : [];
    const funds = user.showMutualFundsInSummary ? await getMutualFunds(forceRefresh) : [];

    return (
        <DashboardLayout>
            <DashboardClient
                expenses={expenses}
                categories={categories}
                stocks={stocks}
                funds={funds}
                showStocksInSummary={user.showStocksInSummary}
                showMutualFundsInSummary={user.showMutualFundsInSummary}
            />
        </DashboardLayout>
    );
}
