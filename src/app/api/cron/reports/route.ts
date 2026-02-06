import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { startOfDay, endOfDay, subDays, subMonths, format } from "date-fns";
import { sendEmail, generateReportHTML } from "@/lib/email";

export async function GET(req: Request) {
    // Security check for Cron (optional)
    const authHeader = req.headers.get("authorization");
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0-6
        const dayOfMonth = now.getDate(); // 1-31

        // 1. Fetch users due for report today
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { reportFrequency: "WEEKLY", reportDay: dayOfWeek },
                    { reportFrequency: "MONTHLY", reportDay: dayOfMonth },
                ],
            },
        });

        const reportResults = [];

        for (const user of users) {
            const periodStart = user.reportFrequency === "WEEKLY" ? subDays(now, 7) : subMonths(now, 1);

            // Fetch expenses for period
            const expenses = await prisma.expense.findMany({
                where: {
                    userId: user.clerkId,
                    date: { gte: periodStart, lte: now },
                    category: { isEmailEnabled: true },
                },
                include: { category: true },
            });

            if (expenses.length === 0) continue;

            // Group by category
            const total = expenses.reduce((sum, e) => sum + e.amount, 0);
            const breakdownMap: Record<string, number> = {};
            expenses.forEach((e) => {
                const catName = e.category.name;
                breakdownMap[catName] = (breakdownMap[catName] || 0) + e.amount;
            });

            const breakdown = Object.entries(breakdownMap)
                .map(([name, amount]) => ({
                    name,
                    amount,
                    percentage: (amount / total) * 100,
                }))
                .sort((a, b) => b.amount - a.amount);

            const highestCategory = breakdown[0]?.name || "None";

            // Generate HTML
            const html = generateReportHTML({
                userName: user.email.split("@")[0],
                duration: user.reportFrequency === "WEEKLY" ? "Weekly" : "Monthly",
                total,
                breakdown,
                highestCategory,
            });

            // Send Email
            await sendEmail({
                to: user.email,
                subject: `Your SpendWise ${user.reportFrequency} Report`,
                html,
            });

            reportResults.push(user.email);
        }

        return NextResponse.json({ success: true, sentTo: reportResults });
    } catch (error: any) {
        console.error("Reports Cron Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
