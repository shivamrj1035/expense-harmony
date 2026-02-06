"use server";

import prisma from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { sendEmail, generateCategoryCalendarHTML } from "@/lib/email";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, differenceInMonths, differenceInWeeks } from "date-fns";

export async function sendCategoryReport(categoryId: string, month: Date) {
    const { userId } = auth();
    const user = await currentUser();
    if (!userId || !user) throw new Error("Unauthorized");

    const category = await prisma.category.findUnique({
        where: { id: categoryId, userId },
    });

    if (!category) throw new Error("Category not found");

    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const expenses = await prisma.expense.findMany({
        where: {
            userId,
            categoryId,
            date: { gte: monthStart, lte: monthEnd },
        },
    });

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    const reportDays = days.map(date => {
        const day = date.getDay();
        const isOrdered = expenses.some(e => isSameDay(new Date(e.date), date));
        const isFuture = date > new Date();
        const interval = category.intervalCount || 1;
        const start = new Date(category.createdAt);

        let isExpected = false;
        if (category.frequency === "DAILY") isExpected = true;
        else if (category.frequency === "WEEKDAYS") isExpected = day >= 1 && day <= 5;
        else if (category.frequency === "WEEKLY") {
            const weeksDiff = Math.abs(differenceInWeeks(date, start));
            isExpected = day === start.getDay() && weeksDiff % interval === 0;
        }
        else if (category.frequency === "MONTHLY") {
            const monthsDiff = Math.abs(differenceInMonths(date, start));
            isExpected = day === start.getDate() && monthsDiff % interval === 0;
        }
        else if (category.frequency === "CUSTOM") {
            const monthsDiff = Math.abs(differenceInMonths(date, start));
            isExpected = category.specificDays?.includes(day) && monthsDiff % interval === 0;
        }

        return {
            day: date.getDate(),
            isOrdered,
            isExpected,
            isFuture,
        };
    });

    const html = generateCategoryCalendarHTML({
        userName: user.firstName || user.emailAddresses[0].emailAddress.split("@")[0],
        categoryName: category.name,
        monthName: format(month, "MMMM yyyy"),
        total,
        fixedAmount: category.fixedAmount,
        days: reportDays,
        startOffset: monthStart.getDay(),
    });

    await sendEmail({
        to: user.emailAddresses[0].emailAddress,
        subject: `SpendWise Category Report: ${category.name} (${format(month, "MMM yyyy")})`,
        html,
    });

    return { success: true };
}
