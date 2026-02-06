import { DashboardLayout } from "@/components/layout/DashboardLayout";
import CategoriesClient from "./CategoriesClient";
import { getCategories } from "@/app/actions/categories";
import { syncUser } from "@/app/actions/user";
import { redirect } from "next/navigation";

export default async function CategoriesPage() {
    const user = await syncUser();

    if (!user) {
        redirect("/auth");
    }

    const categories = await getCategories();

    return (
        <DashboardLayout>
            <CategoriesClient initialCategories={categories} />
        </DashboardLayout>
    );
}
