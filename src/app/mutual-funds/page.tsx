import { DashboardLayout } from "@/components/layout/DashboardLayout";
import MutualFundsClient from "./MutualFundsClient";
import { getMutualFunds } from "@/app/actions/mutual-funds";
import { syncUser } from "@/app/actions/user";
import { redirect } from "next/navigation";

export default async function MutualFundsPage({ searchParams }: { searchParams: { refresh?: string } }) {
    const user = await syncUser();

    if (!user) {
        redirect("/auth");
    }

    const forceRefresh = searchParams.refresh === "true";
    const funds = await getMutualFunds(forceRefresh);

    return (
        <DashboardLayout>
            <MutualFundsClient initialFunds={funds} />
        </DashboardLayout>
    );
}
