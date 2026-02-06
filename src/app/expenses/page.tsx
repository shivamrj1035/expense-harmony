import { DashboardLayout } from "@/components/layout/DashboardLayout";
import ExpensesClient from "./ExpensesClient";
import { getExpenses } from "@/app/actions/expenses";
import { getCategories } from "@/app/actions/categories";
import { syncUser } from "@/app/actions/user";
import { redirect } from "next/navigation";

export default async function ExpensesPage() {
    const user = await syncUser();

    if (!user) {
        redirect("/auth");
    }

    const expenses = await getExpenses();
    const categories = await getCategories();

    return (
        <DashboardLayout>
            <ExpensesClient initialExpenses={expenses} categories={categories} />
        </DashboardLayout>
    );
}
