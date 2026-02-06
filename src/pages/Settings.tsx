import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Bell, Globe, Save } from "lucide-react";

const CURRENCIES = [
  { value: "USD", label: "US Dollar ($)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "GBP", label: "British Pound (£)" },
  { value: "INR", label: "Indian Rupee (₹)" },
  { value: "JPY", label: "Japanese Yen (¥)" },
];

const DAYS_OF_WEEK = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}${getOrdinalSuffix(i + 1)}`,
}));

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export default function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    report_frequency: "WEEKLY" as "WEEKLY" | "MONTHLY",
    report_day: 0,
    currency: "USD",
  });

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("report_frequency, report_day, currency")
      .eq("user_id", user!.id)
      .single();

    if (data && !error) {
      setSettings({
        report_frequency: data.report_frequency || "WEEKLY",
        report_day: data.report_day || 0,
        currency: data.currency || "USD",
      });
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          report_frequency: settings.report_frequency,
          report_day: settings.report_day,
          currency: settings.currency,
        })
        .eq("user_id", user!.id);

      if (error) throw error;

      toast({ title: "Settings saved!" });
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Customize your expense tracking experience
          </p>
        </div>

        {/* Report Settings */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Report Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure how and when you receive expense reports
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Report Frequency</Label>
              <Select
                value={settings.report_frequency}
                onValueChange={(value: "WEEKLY" | "MONTHLY") =>
                  setSettings({ ...settings, report_frequency: value, report_day: 0 })
                }
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
                {settings.report_frequency === "WEEKLY"
                  ? "Day of Week"
                  : "Day of Month"}
              </Label>
              <Select
                value={String(settings.report_day)}
                onValueChange={(value) =>
                  setSettings({ ...settings, report_day: parseInt(value) })
                }
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(settings.report_frequency === "WEEKLY"
                    ? DAYS_OF_WEEK
                    : DAYS_OF_MONTH
                  ).map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </GlassCard>

        {/* Currency Settings */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <h3 className="font-semibold">Currency</h3>
              <p className="text-sm text-muted-foreground">
                Set your preferred currency for displaying amounts
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={settings.currency}
              onValueChange={(value) => setSettings({ ...settings, currency: value })}
            >
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency.value} value={currency.value}>
                    {currency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </GlassCard>

        {/* Account Info */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <SettingsIcon className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold">Account</h3>
              <p className="text-sm text-muted-foreground">
                Your account information
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <div className="p-3 rounded-lg bg-muted/30 text-muted-foreground">
              {user?.email}
            </div>
          </div>
        </GlassCard>

        {/* Save Button */}
        <Button
          onClick={saveSettings}
          className="w-full bg-gradient-primary hover:opacity-90 glow-primary gap-2"
          disabled={loading}
        >
          <Save className="h-4 w-4" />
          {loading ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </DashboardLayout>
  );
}
