import { DashboardLayout } from "@/components/layout/DashboardLayout";
import MoneyManagementClient from "./MoneyManagementClient";
import { getBankAccounts } from "@/app/actions/money-management";
import { syncUser } from "@/app/actions/user";
import { redirect } from "next/navigation";

export default async function MoneyManagementPage() {
    const user = await syncUser();

    if (!user) {
        redirect("/auth");
    }

    const bankAccounts = await getBankAccounts();

    return (
        <DashboardLayout>
            <MoneyManagementClient initialBankAccounts={bankAccounts} />
        </DashboardLayout>
    );
}
