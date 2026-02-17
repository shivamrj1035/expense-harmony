"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function getLiveStockPrice(symbol: string, forceRefresh = false) {
    try {
        const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d${forceRefresh ? `&_t=${Date.now()}` : ""}`,
            {
                next: { revalidate: forceRefresh ? 0 : 300 },
                cache: forceRefresh ? "no-store" : "default"
            }
        );
        const data = await response.json();
        const quote = data.chart.result[0].meta;
        return {
            price: quote.regularMarketPrice,
            currency: quote.currency,
            exchangeName: quote.exchangeName,
            previousClose: quote.chartPreviousClose,
        };
    } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error);
        return null;
    }
}

export async function getStocks(forceRefresh = false) {
    const { userId } = auth();
    if (!userId) return [];

    const stocks = await prisma.stock.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
    });

    // Fetch live prices for all stocks
    const stocksWithPrices = await Promise.all(
        stocks.map(async (stock) => {
            const liveData = await getLiveStockPrice(stock.symbol, forceRefresh);
            return {
                ...stock,
                currentPrice: liveData?.price || stock.avgPrice,
                currency: liveData?.currency || "INR",
                change: liveData ? liveData.price - liveData.previousClose : 0,
            };
        })
    );

    return stocksWithPrices;
}

export async function addStock(data: {
    symbol: string;
    quantity: number;
    avgPrice: number;
}) {
    const { userId } = auth();
    if (!userId) throw new Error("Unauthorized");

    const stock = await prisma.stock.create({
        data: {
            userId,
            symbol: data.symbol.toUpperCase(),
            quantity: data.quantity,
            avgPrice: data.avgPrice,
        },
    });

    revalidatePath("/stocks");
    revalidatePath("/dashboard");
    return stock;
}

export async function deleteStock(id: string) {
    const { userId } = auth();
    if (!userId) throw new Error("Unauthorized");

    await prisma.stock.delete({
        where: { id, userId },
    });

    revalidatePath("/stocks");
    revalidatePath("/dashboard");
}

export async function updateStock(id: string, data: {
    quantity: number;
    avgPrice: number;
}) {
    const { userId } = auth();
    if (!userId) throw new Error("Unauthorized");

    await prisma.stock.update({
        where: { id, userId },
        data,
    });

    revalidatePath("/stocks");
    revalidatePath("/dashboard");
}

export async function searchStocks(query: string) {
    if (!query || query.length < 1) return [];

    try {
        const response = await fetch(
            `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`
        );
        const data = await response.json();

        return data.quotes
            .filter((quote: any) => quote.quoteType === "EQUITY")
            .map((quote: any) => ({
                symbol: quote.symbol,
                name: quote.shortname || quote.longname || quote.symbol,
                exchDisp: quote.exchDisp,
                typeDisp: quote.typeDisp
            }));
    } catch (error) {
        console.error("Error searching stocks:", error);
        return [];
    }
}

export async function syncStocksFromExcel(base64Data: string) {
    const { userId } = auth();
    if (!userId) throw new Error("Unauthorized");

    const XLSX = await import("xlsx");
    const buffer = Buffer.from(base64Data, "base64");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(data.length, 20); i++) {
        const row = data[i];
        if (row && row.some(cell => String(cell).toLowerCase().includes("quantity")) &&
            row.some(cell => String(cell).toLowerCase().includes("average buy price"))) {
            headerRowIndex = i;
            break;
        }
    }

    if (headerRowIndex === -1) {
        throw new Error("Could not find standard holdings headers in Excel. Ensure it has 'Symbol', 'Quantity' and 'Average buy price' columns.");
    }

    const header = data[headerRowIndex].map(h => String(h).toLowerCase());
    const symbolIdx = header.findIndex(h => h.includes("symbol") || h.includes("name") || h.includes("instrument"));
    const qtyIdx = header.findIndex(h => h.includes("quantity"));
    const avgPriceIdx = header.findIndex(h => h.includes("average buy price") || h.includes("buy price"));

    if (symbolIdx === -1 || qtyIdx === -1 || avgPriceIdx === -1) {
        throw new Error("Missing required columns: Symbol, Quantity, or Average buy price");
    }

    const stocksToSyncRaw = data.slice(headerRowIndex + 1)
        .filter(row => row[symbolIdx] && row[qtyIdx] && !isNaN(parseFloat(String(row[qtyIdx]))))
        .map(row => ({
            rawName: String(row[symbolIdx]).trim(),
            quantity: parseFloat(String(row[qtyIdx])),
            avgPrice: parseFloat(String(row[avgPriceIdx])) || 0
        }));

    let syncCount = 0;
    for (const stockData of stocksToSyncRaw) {
        // Resolve rawName to a real ticker
        let resolvedSymbol = stockData.rawName.toUpperCase();

        // Try searching if it doesn't look like a standard ticker or if it contains a space
        if (resolvedSymbol.includes(" ") || resolvedSymbol.length > 8) {
            try {
                const searchResults = await searchStocks(stockData.rawName);
                if (searchResults.length > 0) {
                    // Prefer NSE (.NS) or BSE (.BO) symbols for Indian users if available
                    const preferred = searchResults.find(r => r.symbol.endsWith(".NS") || r.symbol.endsWith(".BO")) || searchResults[0];
                    resolvedSymbol = preferred.symbol;
                }
            } catch (e) {
                console.error(`Failed to resolve symbol for ${stockData.rawName}`);
            }
        }

        const existing = await prisma.stock.findFirst({
            where: { userId, symbol: resolvedSymbol }
        });

        if (existing) {
            await prisma.stock.update({
                where: { id: existing.id },
                data: {
                    quantity: stockData.quantity,
                    avgPrice: stockData.avgPrice
                }
            });
        } else {
            await prisma.stock.create({
                data: {
                    userId,
                    symbol: resolvedSymbol,
                    quantity: stockData.quantity,
                    avgPrice: stockData.avgPrice
                }
            });
        }
        syncCount++;
    }

    revalidatePath("/stocks");
    revalidatePath("/dashboard");
    return { success: true, count: syncCount };
}

export async function refreshPortfolio() {
    const { userId } = auth();
    if (!userId) throw new Error("Unauthorized");

    // Revalidate paths to clear Next.js Data Cache for those pages
    revalidatePath("/stocks");
    revalidatePath("/dashboard");

    return { success: true };
}
