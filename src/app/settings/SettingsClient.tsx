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
import { updateUserSettings } from "@/app/actions/user";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { Moon, Sun, Bell, Globe, Mail } from "lucide-react";

export default function SettingsClient({ user }: { user: any }) {
    const { theme, setTheme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        reportFrequency: user.reportFrequency,
        reportDay: user.reportDay.toString(),
    });

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateUserSettings({
                reportFrequency: formData.reportFrequency,
                reportDay: parseInt(formData.reportDay),
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

                <GlassCard className="p-6 space-y-6 opacity-60">
                    <div className="flex items-center gap-3">
                        <Bell className="h-5 w-5 text-destructive" />
                        <h3 className="font-semibold">Notifications</h3>
                    </div>
                    <p className="text-sm text-muted-foreground italic">Mobile push notifications coming soon...</p>
                </GlassCard>
            </div>
        </div>
    );
}
