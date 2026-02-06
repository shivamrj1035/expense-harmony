"use server";

import prisma from "@/lib/prisma";
import { currentUser, auth } from "@clerk/nextjs/server";

export async function syncUser() {
    const user = await currentUser();

    if (!user) {
        return null;
    }

    const existingUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
    });

    if (existingUser) {
        return existingUser;
    }

    const newUser = await prisma.user.create({
        data: {
            clerkId: user.id,
            email: user.emailAddresses[0].emailAddress,
        },
    });

    return newUser;
}

export async function getUserSettings() {
    const { userId } = auth();
    if (!userId) return null;

    return prisma.user.findUnique({
        where: { clerkId: userId },
    });
}

export async function updateUserSettings(data: {
    reportFrequency: "WEEKLY" | "MONTHLY";
    reportDay: number;
}) {
    const { userId } = auth();
    if (!userId) throw new Error("Unauthorized");

    return prisma.user.update({
        where: { clerkId: userId },
        data,
    });
}
