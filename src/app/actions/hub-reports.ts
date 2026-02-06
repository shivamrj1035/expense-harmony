"use server";

import prisma from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { sendEmail, generateReportHTML } from "@/lib/email";
import { startOfMonth, endOfMonth, format } from "date-fns";

export async function sendMonthlyAnalysisReport(monthStr: string) {
    const { userId } = auth();
    const user = await currentUser();
    if (!userId || !user) throw new Error("Unauthorized");

    const monthDate = new Date(monthStr + "-02"); // Use -02 to avoid timezone shifts
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);

    // Fetch all expenses for the selected month
    const expenses = await prisma.expense.findMany({
        where: {
            userId,
            date: { gte: monthStart, lte: monthEnd },
        },
        include: {
            category: true,
        }
    });

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Group by category
    const categoryMap: Record<string, { name: string; amount: number; color: string }> = {};
    expenses.forEach(e => {
        const catId = e.categoryId || "un-categorized";
        const catName = e.category?.name || "Uncategorized";
        const catColor = e.category?.color || "#7c3aed";

        if (!categoryMap[catId]) {
            categoryMap[catId] = { name: catName, amount: 0, color: catColor };
        }
        categoryMap[catId].amount += e.amount;
    });

    const breakdown = Object.values(categoryMap)
        .sort((a, b) => b.amount - a.amount)
        .map(c => ({
            name: c.name,
            amount: c.amount,
            percentage: totalSpent > 0 ? (c.amount / totalSpent) * 100 : 0
        }));

    const highestCategory = breakdown.length > 0 ? breakdown[0].name : "None";

    // Design the HTML Email
    const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #1a1a1a; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%); padding: 40px 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">Monthly Analysis Hub</h1>
            <p style="margin: 10px 0 0; opacity: 0.9; font-size: 16px; font-weight: 500;">${format(monthDate, "MMMM yyyy")} Financial Insights</p>
        </div>

        <!-- content -->
        <div style="padding: 30px;">
            <p style="font-size: 16px; line-height: 1.6;">Hello ${user.firstName || "User"},</p>
            <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">Your financial clarity for the month is ready. We've synthesized your spending data to give you the most important highlights.</p>

            <!-- Stat Card -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 25px; margin: 30px 0; text-align: center;">
                <span style="font-size: 12px; font-weight: 800; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 8px;">Total Spent</span>
                <span style="font-size: 42px; font-weight: 900; color: #0f172a; display: block;">₹${totalSpent.toLocaleString()}</span>
                <span style="font-size: 14px; color: #64748b; display: block; margin-top: 8px;">Across ${expenses.length} transactions</span>
            </div>

            <!-- Analysis Header -->
            <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 20px; border-left: 4px solid #7c3aed; padding-left: 15px;">Category Breakdown</h3>
            
            <div style="margin-bottom: 30px;">
                ${breakdown.map(item => `
                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; margin-bottom: 6px;">
                            <span>${item.name}</span>
                            <span style="color: #64748b;">₹${item.amount.toLocaleString()} (${item.percentage.toFixed(1)}%)</span>
                        </div>
                        <div style="height: 8px; background-color: #e2e8f0; border-radius: 10px; overflow: hidden;">
                            <div style="width: ${item.percentage}%; height: 100%; background-color: #7c3aed; border-radius: 10px;"></div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div style="background-color: #fff1f2; border-radius: 16px; padding: 20px; margin-bottom: 30px; display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 24px;">🔥</div>
                <div>
                    <span style="display: block; font-size: 12px; font-weight: 800; color: #e11d48; text-transform: uppercase;">Peak Spend Area</span>
                    <span style="display: block; font-size: 16px; font-weight: 700; color: #881337;">${highestCategory}</span>
                </div>
            </div>

            <!-- Action Button -->
            <div style="text-align: center; margin-top: 40px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/reports/download?month=${monthStr}&userId=${userId}" 
                   style="background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%); color: white; padding: 18px 35px; border-radius: 16px; text-decoration: none; font-weight: 800; font-size: 16px; box-shadow: 0 10px 15px -3px rgba(124, 58, 237, 0.3); display: inline-block;">
                    Download PDF Report
                </a>
                <p style="font-size: 11px; color: #94a3b8; margin-top: 15px;">Securely generated for you by SpendWise AI</p>
            </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 30px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0;">
             SpendWise &bull; Digital Expense Companion<br>
             Manage your profile in the app Settings.
        </div>
    </div>
    `;

    await sendEmail({
        to: user.emailAddresses[0].emailAddress,
        subject: `Analysis Hub: ${format(monthDate, "MMMM yyyy")} Report`,
        html,
    });

    return { success: true };
}
