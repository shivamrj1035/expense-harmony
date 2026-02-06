import { DashboardLayout } from "@/components/layout/DashboardLayout";
import SettingsClient from "./SettingsClient";
import { getUserSettings, syncUser } from "@/app/actions/user";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
    const user = await syncUser();

    if (!user) {
        redirect("/auth");
    }

    const settings = await getUserSettings();

    return (
        <DashboardLayout>
            <SettingsClient user={settings} />
        </DashboardLayout>
    );
}
