"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function getLiveMFPrice(symbol: string, forceRefresh = false) {
    try {
        const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d${forceRefresh ? `&_t=${Date.now()}` : ""}`,
            {
                next: { revalidate: forceRefresh ? 0 : 3600 }, // MFs update once a day usually
                cache: forceRefresh ? "no-store" : "default"
            }
        );
        const data = await response.json();

        if (!data.chart || !data.chart.result) return null;

        const quote = data.chart.result[0].meta;
        return {
            price: quote.regularMarketPrice,
            currency: quote.currency || "INR",
            previousClose: quote.chartPreviousClose,
        };
    } catch (error) {
        console.error(`Error fetching MF price for ${symbol}:`, error);
        return null;
    }
}

export async function getMutualFunds(forceRefresh = false) {
    const { userId } = auth();
    if (!userId) return [];

    const funds = await (prisma as any).mutualFund.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
    });

    const fundsWithPrices = await Promise.all(
        funds.map(async (fund: any) => {
            const liveData = await getLiveMFPrice(fund.symbol, forceRefresh);
            return {
                ...fund,
                currentPrice: liveData?.price || fund.avgPrice,
                currency: liveData?.currency || "INR",
                change: liveData ? liveData.price - liveData.previousClose : 0,
            };
        })
    );

    return fundsWithPrices;
}

export async function addMutualFund(data: { symbol: string; quantity: number; avgPrice: number }) {
    const { userId } = auth();
    if (!userId) throw new Error("Unauthorized");

    const fund = await (prisma as any).mutualFund.create({
        data: {
            userId,
            symbol: data.symbol,
            quantity: data.quantity,
            avgPrice: data.avgPrice,
        },
    });

    revalidatePath("/mutual-funds");
    revalidatePath("/dashboard");
    return fund;
}

export async function updateMutualFund(id: string, data: { quantity: number; avgPrice: number }) {
    const { userId } = auth();
    if (!userId) throw new Error("Unauthorized");

    const fund = await (prisma as any).mutualFund.update({
        where: { id },
        data: {
            quantity: data.quantity,
            avgPrice: data.avgPrice,
        },
    });

    revalidatePath("/mutual-funds");
    revalidatePath("/dashboard");
    return fund;
}

export async function deleteMutualFund(id: string) {
    const { userId } = auth();
    if (!userId) throw new Error("Unauthorized");

    await (prisma as any).mutualFund.delete({
        where: { id },
    });

    revalidatePath("/mutual-funds");
    revalidatePath("/dashboard");
    return { success: true };
}

export async function searchMutualFunds(query: string) {
    if (!query || query.length < 1) return [];

    try {
        const response = await fetch(
            `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`
        );
        const data = await response.json();

        return data.quotes
            .filter((quote: any) => quote.quoteType === "MUTUALFUND" || quote.quoteType === "ETF" || quote.quoteType === "EQUITY")
            .map((quote: any) => ({
                symbol: quote.symbol,
                name: quote.shortname || quote.longname || quote.symbol,
                exchDisp: quote.exchDisp,
                typeDisp: quote.typeDisp
            }));
    } catch (error) {
        console.error("Error searching mutual funds:", error);
        return [];
    }
}

export async function syncMutualFundsFromExcel(base64Data: string) {
    const { userId } = auth();
    if (!userId) throw new Error("Unauthorized");

    const XLSX = await import("xlsx");
    const buffer = Buffer.from(base64Data, "base64");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(data.length, 100); i++) {
        const row = data[i];
        if (!row) continue;

        const rowStr = row.map(cell => String(cell).toLowerCase()).join(" ");
        const hasScheme = rowStr.includes("scheme") || rowStr.includes("fund name") || rowStr.includes("instrument") || rowStr.includes("scrip");
        const hasQty = rowStr.includes("units") || rowStr.includes("qty") || rowStr.includes("quantity") || rowStr.includes("shrs");

        if (hasScheme && hasQty) {
            headerRowIndex = i;
            break;
        }
    }

    if (headerRowIndex === -1) {
        throw new Error("Could not find mutual fund headers in Excel. Ensure it has 'Scheme Name' and 'Units/Quantity' columns.");
    }

    const header = data[headerRowIndex].map(h => String(h).toLowerCase());
    const potentialSymbolIdx = header.findIndex(h => h.includes("scheme name") || h.includes("fund name") || h.includes("instrument") || h.includes("scrip"));
    const potentialQtyIdx = header.findIndex(h => h.includes("units") || h.includes("qty") || h.includes("quantity") || h.includes("shrs"));
    const potentialAvgPriceIdx = header.findIndex(h => h.includes("avg. cost") || h.includes("avg cost") || h.includes("purchase price") || h.includes("buy price") || h.includes("average nav") || h.includes("avg. nav"));

    const fundsToSyncRaw = [];
    const rowsToProcess = data.slice(headerRowIndex + 1);

    for (const row of rowsToProcess) {
        if (!row || row.length < 2) continue;

        // Try to find indices for this specific row if it's shifted
        let sIdx = potentialSymbolIdx;
        let qIdx = potentialQtyIdx;
        let aIdx = potentialAvgPriceIdx;

        // Validation for quantity: must be a number and NOT a huge folio number
        const isQtyValid = (idx: number) => {
            const val = parseFloat(String(row[idx]).replace(/,/g, ""));
            return !isNaN(val) && val > 0 && val < 10000000; // Arbitrary cap to avoid folio/sr_no
        };

        // If the initial guess for qty isn't valid, search for a valid numeric index
        if (qIdx !== -1 && !isQtyValid(qIdx)) {
            const betterQIdx = row.findIndex((_, idx) => isQtyValid(idx));
            if (betterQIdx !== -1) {
                qIdx = betterQIdx;
                // If we found a better QIdx, the AvgPrice is likely right after it
                if (aIdx === -1 || aIdx <= qIdx) aIdx = qIdx + 1;
            }
        }

        const name = String(row[sIdx] || "").trim();
        const qty = parseFloat(String(row[qIdx] || "0").replace(/,/g, ""));
        const price = aIdx !== -1 ? parseFloat(String(row[aIdx] || "0").replace(/,/g, "")) : 0;

        if (name && qty > 0 && name.length > 5) {
            fundsToSyncRaw.push({ rawName: name, quantity: qty, avgPrice: isNaN(price) ? 0 : price });
        }
    }

    let syncCount = 0;
    for (const fundData of fundsToSyncRaw) {
        let resolvedSymbol = fundData.rawName;

        // Optimized resolution strategy
        const tryResolve = async (name: string) => {
            const results = await searchMutualFunds(name);
            const mfs = results.filter(r => r.typeDisp === "Mutual Fund" || r.symbol.includes(".BO") || r.symbol.includes(".NS"));
            return mfs.length > 0 ? mfs[0].symbol : null;
        };

        // 1. Try full name
        let symbol = await tryResolve(fundData.rawName);

        // 2. Fallback: Strip common report suffixes
        if (!symbol) {
            const cleanName = fundData.rawName
                .replace(/\b(Direct|Growth|Regular|Payout|Dividend|Plan|Option|IDCW|Growth Plan|Active|Institutional)\b/gi, "")
                .replace(/\s+/g, " ")
                .trim();
            if (cleanName !== fundData.rawName) {
                symbol = await tryResolve(cleanName);
            }
        }

        // 3. Last fallback: Try first 4 words
        if (!symbol) {
            const words = fundData.rawName.split(" ").slice(0, 4).join(" ");
            symbol = await tryResolve(words);
        }

        if (symbol) resolvedSymbol = symbol;

        const existing = await (prisma as any).mutualFund.findFirst({
            where: { userId, symbol: resolvedSymbol }
        });

        if (existing) {
            await (prisma as any).mutualFund.update({
                where: { id: existing.id },
                data: {
                    quantity: fundData.quantity,
                    avgPrice: fundData.avgPrice
                }
            });
        } else {
            await (prisma as any).mutualFund.create({
                data: {
                    userId,
                    symbol: resolvedSymbol,
                    quantity: fundData.quantity,
                    avgPrice: fundData.avgPrice
                }
            });
        }
        syncCount++;
    }

    revalidatePath("/mutual-funds");
    revalidatePath("/dashboard");
    return { success: true, count: syncCount };
}

export async function refreshMFPortfolio() {
    const { userId } = auth();
    if (!userId) throw new Error("Unauthorized");

    revalidatePath("/mutual-funds");
    revalidatePath("/dashboard");

    return { success: true };
}
