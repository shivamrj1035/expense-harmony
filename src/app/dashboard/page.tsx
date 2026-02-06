import { DashboardLayout } from "@/components/layout/DashboardLayout";
import DashboardClient from "./DashboardClient";
import { getExpenses } from "@/app/actions/expenses";
import { getCategories } from "@/app/actions/categories";
import { syncUser } from "@/app/actions/user";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const user = await syncUser();

    if (!user) {
        redirect("/auth");
    }

    const expenses = await getExpenses();
    const categories = await getCategories();

    return (
        <DashboardLayout>
            <DashboardClient expenses={expenses} categories={categories} />
        </DashboardLayout>
    );
}
