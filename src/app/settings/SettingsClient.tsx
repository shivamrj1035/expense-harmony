"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { updateUserSettings } from "@/app/actions/user";
import { testPushNotification, subscribeToPush } from "@/app/actions/notifications";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { Moon, Sun, Bell, Globe, Mail, LayoutDashboard, TrendingUp, PieChart, Wallet, Clock } from "lucide-react";

export default function SettingsClient({ user }: { user: any }) {
    const { theme, setTheme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        reportFrequency: user.reportFrequency,
        reportDay: user.reportDay.toString(),
        monthlyExpenseLimit: user.monthlyExpenseLimit?.toString() || "0",
        manualBalance: user.manualBalance?.toString() || "0",
        recurringSyncTime: user.recurringSyncTime || "00:00",
    });

    const handleTestNotification = async () => {
        if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
            toast.error("This browser does not support push notifications.");
            return;
        }
        
        if (Notification.permission !== "granted") {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                toast.error("Please allow notification permissions to test.");
                return;
            }
        }

        toast.promise(
            (async () => {
                const registration = await navigator.serviceWorker.ready;
                let sub = await registration.pushManager.getSubscription();

                if (!sub) {
                    const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
                    if (!VAPID_PUBLIC_KEY) throw new Error("Push notification configuration is missing on client.");

                    const padding = "=".repeat((4 - (VAPID_PUBLIC_KEY.length % 4)) % 4);
                    const base64 = (VAPID_PUBLIC_KEY + padding).replace(/-/g, "+").replace(/_/g, "/");
                    const rawData = window.atob(base64);
                    const outputArray = new Uint8Array(rawData.length);
                    for (let i = 0; i < rawData.length; ++i) {
                        outputArray[i] = rawData.charCodeAt(i);
                    }

                    sub = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: outputArray,
                    });

                    const subResult = await subscribeToPush(JSON.parse(JSON.stringify(sub)));
                    if (!subResult.success) throw new Error(subResult.error || "Failed to save push subscription.");
                }

                const res = await testPushNotification();
                if(!res.success) throw new Error(res.error || "Failed to trigger test notification");
                if (res.sent === 0) throw new Error("No active push subscriptions found. Please enable notifications for this site first.");
                return res;
            })(),
            {
                loading: 'Testing push notification...',
                success: 'Notification sent! Check your device.',
                error: (err) => err.message || 'Failed to send notification.'
            }
        );
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateUserSettings({
                reportFrequency: formData.reportFrequency,
                reportDay: parseInt(formData.reportDay),
                monthlyExpenseLimit: parseFloat(formData.monthlyExpenseLimit) || 0,
                manualBalance: parseFloat(formData.manualBalance) || 0,
                recurringSyncTime: formData.recurringSyncTime,
            });
            toast.success("Settings saved");
        } catch (error) {
            toast.error("Failed to save settings");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground">Manage your account and preferences</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard className="p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">Email Reports</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Frequency</Label>
                            <Select
                                value={formData.reportFrequency}
                                onValueChange={(val) => setFormData({ ...formData, reportFrequency: val })}
                            >
                                <SelectTrigger className="bg-background/50">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>
                                {formData.reportFrequency === "WEEKLY" ? "Day of the Week" : "Day of the Month"}
                            </Label>
                            <Select
                                value={formData.reportDay}
                                onValueChange={(val) => setFormData({ ...formData, reportDay: val })}
                            >
                                <SelectTrigger className="bg-background/50">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {formData.reportFrequency === "WEEKLY" ? (
                                        <>
                                            <SelectItem value="0">Sunday</SelectItem>
                                            <SelectItem value="1">Monday</SelectItem>
                                            <SelectItem value="2">Tuesday</SelectItem>
                                            <SelectItem value="3">Wednesday</SelectItem>
                                            <SelectItem value="4">Thursday</SelectItem>
                                            <SelectItem value="5">Friday</SelectItem>
                                            <SelectItem value="6">Saturday</SelectItem>
                                        </>
                                    ) : (
                                        Array.from({ length: 28 }, (_, i) => (
                                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                                                {i + 1}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button onClick={handleSave} className="w-full bg-gradient-primary" disabled={loading}>
                            {loading ? "Saving..." : "Save Report Settings"}
                        </Button>
                    </div>
                </GlassCard>

                <GlassCard className="p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <Sun className="h-5 w-5 text-secondary" />
                        <h3 className="font-semibold">Appearance</h3>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                            {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                            <span>Dark Mode</span>
                        </div>
                        <Switch
                            checked={theme === "dark"}
                            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                        />
                    </div>
                </GlassCard>

                <GlassCard className="p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <Wallet className="h-5 w-5 text-accent" />
                        <h3 className="font-semibold">Financial Configuration</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Monthly Expense Limit</Label>
                            <Input
                                type="number"
                                placeholder="e.g. 20000"
                                value={formData.monthlyExpenseLimit}
                                onChange={(e) => setFormData({ ...formData, monthlyExpenseLimit: e.target.value })}
                                className="bg-background/50"
                            />
                            <p className="text-xs text-muted-foreground">The maximum amount you intend to spend each month.</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Current Balance</Label>
                            <Input
                                type="number"
                                placeholder="e.g. 50000"
                                value={formData.manualBalance}
                                onChange={(e) => setFormData({ ...formData, manualBalance: e.target.value })}
                                className="bg-background/50"
                            />
                            <p className="text-xs text-muted-foreground">Manually update this at the start of each month.</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Recurring Entry Time
                            </Label>
                            <Input
                                type="time"
                                value={formData.recurringSyncTime}
                                onChange={(e) => setFormData({ ...formData, recurringSyncTime: e.target.value })}
                                className="bg-background/50"
                            />
                            <p className="text-xs text-muted-foreground">The default time of day when auto-generated expenses are logged.</p>
                        </div>
                        <Button onClick={handleSave} className="w-full bg-gradient-primary" disabled={loading}>
                            {loading ? "Saving..." : "Save Financial Settings"}
                        </Button>
                    </div>
                </GlassCard>

                <GlassCard className="p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-accent" />
                        <h3 className="font-semibold">Preferences</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Currency</Label>
                            <Select defaultValue="INR">
                                <SelectTrigger className="bg-background/50">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                    <SelectItem value="GBP">GBP (£)</SelectItem>
                                    <SelectItem value="INR">INR (₹)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <LayoutDashboard className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">Dashboard</h3>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="h-4 w-4" />
                            <span>Show Stocks in Summary</span>
                        </div>
                        <Switch
                            checked={user.showStocksInSummary}
                            onCheckedChange={async (checked) => {
                                try {
                                    await updateUserSettings({ showStocksInSummary: checked });
                                    toast.success("Dashboard preference updated");
                                    window.location.reload();
                                } catch (error) {
                                    toast.error("Failed to update preference");
                                }
                            }}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                            <PieChart className="h-4 w-4" />
                            <span>Show Mutual Funds in Summary</span>
                        </div>
                        <Switch
                            checked={user.showMutualFundsInSummary}
                            onCheckedChange={async (checked) => {
                                try {
                                    await updateUserSettings({ showMutualFundsInSummary: checked });
                                    toast.success("Dashboard preference updated");
                                    window.location.reload();
                                } catch (error) {
                                    toast.error("Failed to update preference");
                                }
                            }}
                        />
                    </div>
                </GlassCard>

                <GlassCard className="p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <Bell className="h-5 w-5 text-accent" />
                        <h3 className="font-semibold">Notifications</h3>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <p className="text-sm text-muted-foreground">Test your device's push notification receiver to ensure you get alerts for auto-generated recurring expenses.</p>
                            <Button variant="outline" onClick={handleTestNotification} className="w-full sm:w-auto mt-2">
                                Test Push Notification
                            </Button>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
