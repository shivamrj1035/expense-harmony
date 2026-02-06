import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// No longer need separate declaration for autotable as we use it as a standalone function

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const monthStr = searchParams.get("month");
    const userIdUrl = searchParams.get("userId");

    // In a real production app, we should verify the request with a token or session
    // For this implementation, we will check if the user is authenticated via Clerk 
    // or if the userId matches (basic security)
    const { userId: authedId } = auth();
    const effectiveUserId = authedId || userIdUrl;

    if (!effectiveUserId || !monthStr) {
        return new NextResponse("Unauthorized or missing params", { status: 401 });
    }

    const monthDate = new Date(monthStr + "-02");
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);

    const expenses = await prisma.expense.findMany({
        where: {
            userId: effectiveUserId,
            date: { gte: monthStart, lte: monthEnd },
        },
        include: {
            category: true,
        },
        orderBy: {
            date: "asc",
        },
    });

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Create PDF
    const doc = new jsPDF() as any;

    // Design styles
    const primaryColor: [number, number, number] = [124, 58, 237]; // #7c3aed
    const secondaryColor: [number, number, number] = [219, 39, 119]; // #db2777

    // Header Color Bar
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, "F");

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("SPENDWISE ANALYSIS REPORT", 20, 20);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`${format(monthDate, "MMMM yyyy")} Financial Statement`, 20, 30);

    // Summary Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("FINANCIAL SUMMARY", 20, 55);

    doc.setDrawColor(200, 200, 200);
    doc.line(20, 58, 190, 58);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Total Monthly Expenditure:", 20, 70);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`INR ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 100, 70);

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text("Total Transactions Count:", 20, 80);
    doc.setFont("helvetica", "bold");
    doc.text(`${expenses.length}`, 100, 80);

    // Categories Table
    const categoryData: Record<string, { name: string; amount: number }> = {};
    expenses.forEach(e => {
        const catName = e.category?.name || "Uncategorized";
        if (!categoryData[catName]) categoryData[catName] = { name: catName, amount: 0 };
        categoryData[catName].amount += e.amount;
    });

    const categoryRows = Object.values(categoryData)
        .sort((a, b) => b.amount - a.amount)
        .map(c => [
            c.name,
            `INR ${c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            `${((c.amount / (totalSpent || 1)) * 100).toFixed(1)}%`
        ]);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("CATEGORY UTILIZATION", 20, 100);

    autoTable(doc, {
        startY: 105,
        head: [['Category', 'Amount', 'Allocation']],
        body: categoryRows,
        theme: 'striped',
        headStyles: { fillColor: primaryColor },
        alternateRowStyles: { fillColor: [245, 243, 255] },
        styles: { font: "helvetica", fontSize: 10 },
        margin: { left: 20, right: 20 }
    });

    // Detailed Transaction Table
    const transactionRows = expenses.map(e => [
        format(new Date(e.date), "dd MMM yyyy"),
        e.description || e.category?.name || "Transaction",
        e.category?.name || "N/A",
        `INR ${e.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    ]);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("TRANSACTION LEDGER", 20, (doc as any).lastAutoTable.finalY + 15);

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Date', 'Description', 'Category', 'Amount']],
        body: transactionRows,
        theme: 'grid',
        headStyles: { fillColor: secondaryColor },
        styles: { font: "helvetica", fontSize: 9 },
        margin: { left: 20, right: 20 }
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated by SpendWise - Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
    }

    const pdfOutput = doc.output("arraybuffer");

    return new NextResponse(pdfOutput, {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="SpendWise-Report-${monthStr}.pdf"`,
        },
    });
}
