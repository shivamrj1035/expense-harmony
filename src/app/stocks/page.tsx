import { DashboardLayout } from "@/components/layout/DashboardLayout";
import StocksClient from "./StocksClient";
import { getStocks } from "@/app/actions/stocks";
import { syncUser } from "@/app/actions/user";
import { redirect } from "next/navigation";

export default async function StocksPage({ searchParams }: { searchParams: { refresh?: string } }) {
    const user = await syncUser();

    if (!user) {
        redirect("/auth");
    }

    const forceRefresh = searchParams.refresh === "true";
    const stocks = await getStocks(forceRefresh);

    return (
        <DashboardLayout>
            <StocksClient initialStocks={stocks} />
        </DashboardLayout>
    );
}
