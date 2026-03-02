"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { subscribeToPush, unsubscribeFromPush } from "@/app/actions/notifications";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function PushNotificationManager() {
    const [isSupported, setIsSupported] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if ("serviceWorker" in navigator && "PushManager" in window) {
            setIsSupported(true);
            checkSubscription();
        } else {
            setLoading(false);
        }
    }, []);

    async function checkSubscription() {
        try {
            const registration = await navigator.serviceWorker.ready;
            const sub = await registration.pushManager.getSubscription();
            setSubscription(sub);
        } catch (error) {
            console.error("Error checking subscription:", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubscribe() {
        if (!VAPID_PUBLIC_KEY) {
            toast.error("Push notification configuration is missing.");
            return;
        }

        setLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;

            // Convert VAPID key to Uint8Array
            const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey,
            });

            const result = await subscribeToPush(JSON.parse(JSON.stringify(sub)));

            if (result.success) {
                setSubscription(sub);
                toast.success("Push notifications enabled!");
            } else {
                toast.error(result.error || "Failed to sync subscription.");
            }
        } catch (error: any) {
            if (Notification.permission === "denied") {
                toast.error("Notification permission denied. Please enable it in your browser settings.");
            } else {
                console.error("Subscription Error:", error);
                toast.error("Failed to enable push notifications.");
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleUnsubscribe() {
        if (!subscription) return;

        setLoading(true);
        try {
            await subscription.unsubscribe();
            await unsubscribeFromPush(subscription.endpoint);
            setSubscription(null);
            toast.success("Push notifications disabled.");
        } catch (error) {
            console.error("Unsubscribe Error:", error);
            toast.error("Failed to disable notifications.");
        } finally {
            setLoading(false);
        }
    }

    if (!isSupported) return null;

    return (
        <div className="fixed bottom-24 right-6 z-50">
            {subscription ? (
                <Button
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 rounded-full border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 glow-primary"
                    onClick={handleUnsubscribe}
                    disabled={loading}
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                </Button>
            ) : (
                <Button
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 rounded-full border-muted-foreground/20 bg-muted text-muted-foreground hover:bg-muted/80"
                    onClick={handleSubscribe}
                    disabled={loading}
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
                </Button>
            )}
        </div>
    );
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
