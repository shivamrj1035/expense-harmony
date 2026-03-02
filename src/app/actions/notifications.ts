"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import webpush from "web-push";

// Configure web-push
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        `mailto:${process.env.GMAIL_USER}`,
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

export async function subscribeToPush(subscription: any) {
    const { userId } = auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    try {
        await (prisma as any).pushSubscription.upsert({
            where: { endpoint: subscription.endpoint },
            update: {
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                userId,
            },
            create: {
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                userId,
            },
        });

        return { success: true };
    } catch (error: any) {
        console.error("Push Subscribe Error:", error);
        return { success: false, error: error.message };
    }
}

export async function unsubscribeFromPush(endpoint: string) {
    try {
        await prisma.pushSubscription.delete({
            where: { endpoint },
        });
        return { success: true };
    } catch (error: any) {
        console.error("Push Unsubscribe Error:", error);
        return { success: false, error: error.message };
    }
}

export async function sendPushNotification(userId: string, title: string, body: string, url: string = "/dashboard") {
    const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId },
    });

    const payload = JSON.stringify({
        title,
        body,
        url,
    });

    const results = await Promise.allSettled(
        subscriptions.map((sub) =>
            webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth,
                    },
                },
                payload
            )
        )
    );

    // Clean up expired subscriptions
    const expiredEndpoints = results
        .filter((res) => res.status === "rejected" && (res.reason.statusCode === 410 || res.reason.statusCode === 404))
        .map((_, i) => subscriptions[i].endpoint);

    if (expiredEndpoints.length > 0) {
        await prisma.pushSubscription.deleteMany({
            where: { endpoint: { in: expiredEndpoints } },
        });
    }

    return {
        success: true,
        total: subscriptions.length,
        sent: results.filter(r => r.status === "fulfilled").length
    };
}
