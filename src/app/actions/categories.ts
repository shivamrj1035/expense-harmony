"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function getCategories() {
    const { userId } = auth();
    if (!userId) return [];

    return prisma.category.findMany({
        where: { userId },
        orderBy: [
            { sortOrder: "asc" },
            { createdAt: "desc" }
        ],
    });
}

export async function createCategory(data: any) {
    const { userId } = auth();
    if (!userId) throw new Error("Unauthorized");

    const existingCount = await prisma.category.count({ where: { userId } });
    const colors = ["#8B5CF6", "#06B6D4", "#10B981", "#F43F5E", "#F59E0B", "#EC4899", "#3B82F6", "#6366F1"];
    const autoColor = colors[existingCount % colors.length];

    const category = await prisma.category.create({
        data: {
            ...data,
            color: data.color || autoColor,
            sortOrder: existingCount,
            userId,
        },
    });

    revalidatePath("/categories");
    revalidatePath("/dashboard");
    return category;
}

export async function updateCategory(id: string, data: any) {
    const { userId } = auth();
    if (!userId) throw new Error("Unauthorized");

    const category = await prisma.category.update({
        where: { id, userId },
        data,
    });

    revalidatePath("/categories");
    revalidatePath("/dashboard");
    return category;
}

export async function deleteCategory(id: string) {
    const { userId } = auth();
    if (!userId) throw new Error("Unauthorized");

    await prisma.category.delete({
        where: { id, userId },
    });

    revalidatePath("/categories");
    revalidatePath("/dashboard");
}

export async function reorderCategories(ids: string[]) {
    const { userId } = auth();
    if (!userId) throw new Error("Unauthorized");

    const updates = ids.map((id, index) =>
        prisma.category.update({
            where: { id, userId },
            data: { sortOrder: index },
        })
    );

    await prisma.$transaction(updates);
    revalidatePath("/categories");
    revalidatePath("/dashboard");
}
