"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import path from "path";
import { pathToFileURL } from "url";

// Import PDF.js using the legacy build which is node-compatible
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// Configure PDF.js worker path for Node environments (Windows compatible)
const workerPath = path.resolve(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs");
pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "DEBIT" | "CREDIT";
  balance: number;
  category: string;
}

// Simple rule-based transaction categorizer
function autoCategorize(description: string, type: "DEBIT" | "CREDIT"): string {
  const desc = description.toUpperCase();
  if (type === "CREDIT") {
    if (desc.includes("SALARY") || desc.includes("CEREBULB") || desc.includes("INTEREST") || desc.includes("INT.PD")) {
      return "Salary/Income";
    }
    return "Income";
  }

  // Debits
  if (desc.includes("ZEPTO") || desc.includes("DMART") || desc.includes("SUPERMARTS") || desc.includes("GROCERY")) {
    return "Groceries";
  }
  if (desc.includes("MCDONALDS") || desc.includes("ZOMATO") || desc.includes("SWIGGY") || desc.includes("PIZZA") || desc.includes("CAFE") || desc.includes("REST") || desc.includes("FOOD")) {
    return "Food/Dining";
  }
  if (desc.includes("GROWW") || desc.includes("MUTUAL") || desc.includes("INVEST") || desc.includes("SECURITIES") || desc.includes("BROKING")) {
    return "Investments";
  }
  if (desc.includes("RENT") || desc.includes("HOUSE")) {
    return "Rent";
  }
  if (desc.includes("AIRTEL") || desc.includes("RECHARGE") || desc.includes("BILL") || desc.includes("ELECTRIC") || desc.includes("GAS") || desc.includes("UTILITY")) {
    return "Bills/Utilities";
  }
  if (desc.includes("DECLINE") || desc.includes("FEE") || desc.includes("CHRG") || desc.includes("CHARGE") || desc.includes("TAX") || desc.includes("GST")) {
    return "Charges/Fees";
  }
  if (desc.includes("TRANSFER") || desc.includes("TO KOTAK") || desc.includes("TO SBI") || desc.includes("AC XFR")) {
    return "Transfer";
  }
  return "Shopping/Others";
}

// Fetch all bank accounts and statements for the current user
export async function getBankAccounts() {
  const { userId } = auth();
  if (!userId) return [];

  return prisma.bankAccount.findMany({
    where: { userId },
    include: {
      statements: {
        orderBy: { month: "desc" },
      },
    },
    orderBy: { bankName: "asc" },
  });
}

// Create a new manual bank account
export async function addManualAccount(bankName: string, accountNumber: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const account = await prisma.bankAccount.create({
    data: {
      userId,
      bankName: bankName.toUpperCase(),
      accountNumber: accountNumber.trim(),
    },
  });

  revalidatePath("/money-management");
  revalidatePath("/dashboard");
  return account;
}

// Delete a bank statement
export async function deleteBankStatement(id: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  await prisma.bankStatement.delete({
    where: { id },
  });

  revalidatePath("/money-management");
  revalidatePath("/dashboard");
  return { success: true };
}

// Save or edit a bank statement manually (from Excel view)
export async function saveBankStatement(
  bankAccountId: string,
  statementId: string | null,
  data: {
    month: string;
    duration: string;
    startingBalance: number;
    closingBalance: number;
    totalSpent: number;
    totalReceived: number;
    transactions: ParsedTransaction[];
  }
) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  if (statementId) {
    // Update existing statement
    const updated = await prisma.bankStatement.update({
      where: { id: statementId },
      data: {
        month: data.month,
        duration: data.duration,
        startingBalance: data.startingBalance,
        closingBalance: data.closingBalance,
        totalSpent: data.totalSpent,
        totalReceived: data.totalReceived,
        transactions: data.transactions as any,
      },
    });
    revalidatePath("/money-management");
    revalidatePath("/dashboard");
    return updated;
  } else {
    // Create new statement
    const created = await prisma.bankStatement.create({
      data: {
        bankAccountId,
        month: data.month,
        duration: data.duration,
        startingBalance: data.startingBalance,
        closingBalance: data.closingBalance,
        totalSpent: data.totalSpent,
        totalReceived: data.totalReceived,
        transactions: data.transactions as any,
      },
    });
    revalidatePath("/money-management");
    revalidatePath("/dashboard");
    return created;
  }
}

// Upload and parse a PDF statement
export async function uploadBankStatement(
  bankName: string,
  base64Data: string,
  password?: string
) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const pdfBuffer = Buffer.from(base64Data, "base64");
  const uint8Array = new Uint8Array(pdfBuffer);

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      password,
      useSystemFonts: true,
      disableFontFace: true,
    });

    const pdf = await loadingTask.promise;
    const reconstructedLines: string[] = [];

    // Reconstruct lines from all pages
    const tolerance = 4;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageLines: { y: number; items: { x: number; str: string }[] }[] = [];

      for (const item of textContent.items as any[]) {
        if (!item.str || item.str.trim() === "") continue;
        const x = item.transform[4];
        const y = item.transform[5];

        let found = false;
        for (const line of pageLines) {
          if (Math.abs(line.y - y) <= tolerance) {
            line.items.push({ x, str: item.str });
            found = true;
            break;
          }
        }
        if (!found) {
          pageLines.push({ y, items: [{ x, str: item.str }] });
        }
      }

      // Sort lines top to bottom
      pageLines.sort((a, b) => b.y - a.y);

      // Sort items within each line left to right and join
      for (const line of pageLines) {
        line.items.sort((a, b) => a.x - b.x);
        const lineText = line.items.map((it) => it.str).join(" ");
        reconstructedLines.push(lineText);
      }
    }

    // Now, parse the statements using bank-specific rules
    let parsedData = null;

    if (bankName === "AXIS") {
      parsedData = parseAxisStatement(reconstructedLines);
    } else if (bankName === "BOB") {
      parsedData = parseBobStatement(reconstructedLines);
    } else if (bankName === "KOTAK") {
      parsedData = parseKotakStatement(reconstructedLines);
    } else if (bankName === "SBI") {
      parsedData = parseSbiStatement(reconstructedLines);
    } else {
      throw new Error("Unsupported bank statement type");
    }

    if (!parsedData || parsedData.transactions.length === 0) {
      throw new Error("No transactions could be extracted from this statement. Please check the file.");
    }

    // Find or create the Bank Account in the database
    let account = await prisma.bankAccount.findFirst({
      where: {
        userId,
        bankName,
        accountNumber: parsedData.accountNumber,
      },
    });

    if (!account) {
      account = await prisma.bankAccount.create({
        data: {
          userId,
          bankName,
          accountNumber: parsedData.accountNumber,
        },
      });
    }

    // Delete existing statement for the same month to prevent duplicates
    const existingStatement = await prisma.bankStatement.findFirst({
      where: {
        bankAccountId: account.id,
        month: parsedData.month,
      },
    });

    if (existingStatement) {
      await prisma.bankStatement.delete({
        where: { id: existingStatement.id },
      });
    }

    // Save the new statement
    const statement = await prisma.bankStatement.create({
      data: {
        bankAccountId: account.id,
        month: parsedData.month,
        duration: parsedData.duration,
        startingBalance: parsedData.startingBalance,
        closingBalance: parsedData.closingBalance,
        totalSpent: parsedData.totalSpent,
        totalReceived: parsedData.totalReceived,
        transactions: parsedData.transactions as any,
      },
    });

    revalidatePath("/money-management");
    revalidatePath("/dashboard");

    return { success: true, account, statement };
  } catch (err: any) {
    console.error("PDF Parsing Error:", err);
    if (err.name === "PasswordException" || err.message?.toLowerCase().includes("password")) {
      return {
        success: false,
        error: "PASSWORD_REQUIRED",
        message: err.message?.includes("Incorrect")
          ? "Incorrect password. Please try again."
          : "This statement is password-protected. Please enter the password to decrypt it.",
      };
    }
    return {
      success: false,
      error: "PARSE_ERROR",
      message: err.message || "Failed to parse PDF statement.",
    };
  }
}

// Axis statement parser implementation
function parseAxisStatement(lines: string[]) {
  let accountNumber = "UNKNOWN";
  let month = "UNKNOWN";
  let duration = "";
  let inTransactions = false;
  let rawTxns: { date: string; particulars: string; amount: number; balance: number }[] = [];
  let orphanDescription: string[] = [];

  for (const line of lines) {
    // 1. Account Number & Period
    if (line.includes("Statement of Axis Account No:")) {
      const accMatch = line.match(/Account No:\s*(\d+)/i);
      if (accMatch) accountNumber = accMatch[1].slice(-4); // Store last 4 digits for privacy

      const periodMatch = line.match(/period\s*\(From:\s*([\d-]+)\s*To:\s*([\d-]+)\)/i);
      if (periodMatch) {
        duration = `${periodMatch[1]} to ${periodMatch[2]}`;
        // Extract month as "YYYY-MM" from "From" date (e.g. "01-04-2026")
        const parts = periodMatch[1].split("-");
        if (parts.length === 3) {
          month = `${parts[2]}-${parts[1]}`;
        }
      }
    }

    // 2. Detect Transactions Block
    if (line.includes("OPENING BALANCE")) {
      inTransactions = true;
      continue;
    }
    if (line.includes("TRANSACTION TOTAL") || line.includes("CLOSING BALANCE")) {
      inTransactions = false;
      continue;
    }

    // 3. Extract Transactions
    if (inTransactions) {
      // Axis Row format: Date Particulars Amount Balance BranchCode
      const match = line.match(/^(\d{2}-\d{2}-\d{4})\s+(.+?)\s+([\d,.-]+)\s+([\d,.-]+)\s+(\d+)$/);
      if (match) {
        const date = match[1];
        let particulars = match[2];
        const amount = parseFloat(match[3].replace(/,/g, ""));
        const balance = parseFloat(match[4].replace(/,/g, ""));

        if (orphanDescription.length > 0) {
          particulars = orphanDescription.join(" ") + " " + particulars;
          orphanDescription = [];
        }

        rawTxns.push({ date, particulars, amount, balance });
      } else {
        // Collect multi-line descriptions
        orphanDescription.push(line.trim());
      }
    }
  }

  if (rawTxns.length === 0) return null;

  // Calculate transaction directions and back-calculate starting balance
  const transactions: ParsedTransaction[] = [];
  let previousBalance = 0;
  let totalSpent = 0;
  let totalReceived = 0;

  // Re-verify the starting balance. Let's calculate from first transaction
  const firstTxn = rawTxns[0];
  let calculatedOpening = firstTxn.balance - firstTxn.amount; // default assumption as credit
  // Let's verify by matching it to the next transaction.
  // Actually, we can just do the progressive analysis:
  // For the first row, we can read the opening balance from statement if available, or do standard math.
  // Let's find OPENING BALANCE line in the statement to get the exact value
  let openingBalance = 0;
  const openingLine = lines.find((l) => l.includes("OPENING BALANCE"));
  if (openingLine) {
    const balanceMatch = openingLine.match(/OPENING BALANCE\s+([\d,.]+)/i);
    if (balanceMatch) {
      openingBalance = parseFloat(balanceMatch[1].replace(/,/g, ""));
    }
  }
  if (!openingBalance) {
    openingBalance = calculatedOpening;
  }

  previousBalance = openingBalance;

  rawTxns.forEach((txn, index) => {
    const diff = txn.balance - previousBalance;
    const type = diff >= -0.01 ? "CREDIT" : "DEBIT";

    if (type === "DEBIT") {
      totalSpent += txn.amount;
    } else {
      totalReceived += txn.amount;
    }

    transactions.push({
      id: `${txn.date}-${index}`,
      date: txn.date,
      description: txn.particulars,
      amount: txn.amount,
      type,
      balance: txn.balance,
      category: autoCategorize(txn.particulars, type),
    });

    previousBalance = txn.balance;
  });

  const closingBalance = transactions[transactions.length - 1].balance;

  return {
    accountNumber,
    month,
    duration,
    startingBalance: openingBalance,
    closingBalance,
    totalSpent,
    totalReceived,
    transactions,
  };
}

// BOB statement parser implementation
function parseBobStatement(lines: string[]) {
  let accountNumber = "UNKNOWN";
  let month = "UNKNOWN";
  let duration = "";
  let inTransactions = false;
  let rawTxns: { date: string; particulars: string; amount: number; balance: number }[] = [];
  let orphanDescription: string[] = [];
  let openingBalance = 0;

  for (const line of lines) {
    if (line.includes("Account Statement from")) {
      const periodMatch = line.match(/from\s*([\d-]+)\s*to\s*([\d-]+)/i);
      if (periodMatch) {
        duration = `${periodMatch[1]} to ${periodMatch[2]}`;
        const parts = periodMatch[1].split("-");
        if (parts.length === 3) {
          month = `${parts[2]}-${parts[1]}`;
        }
      }
    }

    if (line.includes("Account Number")) {
      // Find the account number on the next line or in same line
      const accIdx = lines.indexOf(line);
      if (accIdx !== -1 && lines[accIdx + 1]) {
        const nextLine = lines[accIdx + 1];
        const accMatch = nextLine.match(/^(\d+)/);
        if (accMatch) accountNumber = accMatch[1].slice(-4);
      }
    }

    // BOB table starts after headers
    if (line.includes("Opening Balance")) {
      inTransactions = true;
      const balMatch = line.match(/Opening Balance\s+-\s+-\s+([\d,.]+)/i) || line.match(/Opening Balance.*?([\d,.]+)/i);
      if (balMatch) {
        openingBalance = parseFloat(balMatch[1].replace(/,/g, ""));
      }
      continue;
    }

    if (line.includes("Note:") || line.includes("Page 1 of")) {
      inTransactions = false;
      continue;
    }

    if (inTransactions) {
      // BOB Row format: SerialNo Date Date ChequeNo Amount Balance
      const match = line.match(/^(\d+)\s+(\d{2}-\d{2}-\d{4})\s+(\d{2}-\d{2}-\d{4})\s+(\S+)\s+([\d,.-]+)\s+([\d,.-]+)$/);
      if (match) {
        const date = match[2];
        const amount = parseFloat(match[5].replace(/,/g, ""));
        const balance = parseFloat(match[6].replace(/,/g, ""));
        let particulars = orphanDescription.join(" ");
        orphanDescription = [];

        rawTxns.push({ date, particulars, amount, balance });
      } else {
        // Collect multi-line descriptions (printed above BOB transaction details line)
        orphanDescription.push(line.trim());
      }
    }
  }

  if (rawTxns.length === 0) return null;

  const transactions: ParsedTransaction[] = [];
  let previousBalance = openingBalance;
  let totalSpent = 0;
  let totalReceived = 0;

  rawTxns.forEach((txn, index) => {
    const diff = txn.balance - previousBalance;
    const type = diff >= -0.01 ? "CREDIT" : "DEBIT";

    if (type === "DEBIT") {
      totalSpent += txn.amount;
    } else {
      totalReceived += txn.amount;
    }

    transactions.push({
      id: `${txn.date}-${index}`,
      date: txn.date,
      description: txn.particulars || "Online Transaction",
      amount: txn.amount,
      type,
      balance: txn.balance,
      category: autoCategorize(txn.particulars || "Online Transaction", type),
    });

    previousBalance = txn.balance;
  });

  const closingBalance = transactions[transactions.length - 1].balance;

  return {
    accountNumber,
    month,
    duration,
    startingBalance: openingBalance,
    closingBalance,
    totalSpent,
    totalReceived,
    transactions,
  };
}

// Kotak statement parser implementation
function parseKotakStatement(lines: string[]) {
  let accountNumber = "UNKNOWN";
  let month = "UNKNOWN";
  let duration = "";
  let inTransactions = false;
  let rawTxns: { date: string; particulars: string; amount: number; balance: number }[] = [];
  let currentTxn: { date: string; particulars: string; amount: number; balance: number } | null = null;
  let openingBalance = 0;

  for (const line of lines) {
    if (line.includes("Account No.")) {
      const accMatch = line.match(/Account No\.\s*(\d+)/i);
      if (accMatch) accountNumber = accMatch[1].slice(-4);
    }

    if (line.match(/^\d{2}\s+[A-Za-z]{3}\s+\d{4}\s+-\s+\d{2}\s+[A-Za-z]{3}\s+\d{4}/)) {
      const match = line.match(/^(\d{2}\s+[A-Za-z]{3}\s+\d{4})\s+-\s+(\d{2}\s+[A-Za-z]{3}\s+\d{4})/);
      if (match) {
        duration = `${match[1]} to ${match[2]}`;
        // Convert "01 Apr 2026" to "2026-04"
        const parts = match[1].split(" ");
        if (parts.length === 3) {
          const year = parts[2];
          const monthsMap: Record<string, string> = {
            Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
            Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12"
          };
          month = `${year}-${monthsMap[parts[1]] || "01"}`;
        }
      }
    }

    if (line.includes("Opening Balance") && line.includes("932.00") || line.includes("Opening Balance")) {
      const balMatch = line.match(/Opening Balance\s+-\s+-\s+-\s+([\d,.]+)/) || line.match(/Opening Balance.*?([\d,.]+)/);
      if (balMatch) {
        openingBalance = parseFloat(balMatch[1].replace(/,/g, ""));
      }
      inTransactions = true;
      continue;
    }

    if (line.includes("Account Summary") || line.includes("Statement Generated on") || line.includes("End of Statement")) {
      inTransactions = false;
      if (currentTxn) {
        rawTxns.push(currentTxn);
        currentTxn = null;
      }
      continue;
    }

    if (inTransactions) {
      // Kotak Row format: Serial Date Particulars Amount Balance
      const match = line.match(/^(\d+)\s+(\d{2}\s+[A-Za-z]{3}\s+\d{4})\s+(.+?)\s+([\d,.-]+)\s+([\d,.-]+)$/);
      if (match) {
        if (currentTxn) {
          rawTxns.push(currentTxn);
        }

        const date = match[2];
        const particulars = match[3];
        const amount = parseFloat(match[4].replace(/,/g, ""));
        const balance = parseFloat(match[5].replace(/,/g, ""));

        currentTxn = { date, particulars, amount, balance };
      } else {
        // Collect multi-line descriptions (printed below transaction details line)
        if (currentTxn && !line.includes("Savings Account Transactions")) {
          currentTxn.particulars += " " + line.trim();
        }
      }
    }
  }

  if (currentTxn) {
    rawTxns.push(currentTxn);
  }

  // Get opening balance from summary block if not found
  if (!openingBalance) {
    const summaryLine = lines.find((l) => l.includes("Savings Account (SA):"));
    if (summaryLine) {
      const parts = summaryLine.split(/\s+/);
      const val = parts.find((p) => p.includes("."));
      if (val) openingBalance = parseFloat(val.replace(/,/g, ""));
    }
  }

  if (rawTxns.length === 0) return null;

  const transactions: ParsedTransaction[] = [];
  let previousBalance = openingBalance;
  let totalSpent = 0;
  let totalReceived = 0;

  rawTxns.forEach((txn, index) => {
    const diff = txn.balance - previousBalance;
    const type = diff >= -0.01 ? "CREDIT" : "DEBIT";

    if (type === "DEBIT") {
      totalSpent += txn.amount;
    } else {
      totalReceived += txn.amount;
    }

    transactions.push({
      id: `${txn.date}-${index}`,
      date: txn.date,
      description: txn.particulars,
      amount: txn.amount,
      type,
      balance: txn.balance,
      category: autoCategorize(txn.particulars, type),
    });

    previousBalance = txn.balance;
  });

  const closingBalance = transactions[transactions.length - 1].balance;

  return {
    accountNumber,
    month,
    duration,
    startingBalance: openingBalance,
    closingBalance,
    totalSpent,
    totalReceived,
    transactions,
  };
}

// SBI statement parser implementation
function parseSbiStatement(lines: string[]) {
  let accountNumber = "UNKNOWN";
  let month = "UNKNOWN";
  let duration = "";
  let inTransactions = false;
  let rawTxns: { date: string; particulars: string; amount: number; balance: number; type: "DEBIT" | "CREDIT" }[] = [];
  let currentTxn: { date: string; particulars: string; amount: number; balance: number; type: "DEBIT" | "CREDIT" } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Extract Account Number
    if (line.includes("Account Number")) {
      for (let j = 1; j <= 5; j++) {
        if (lines[i + j] && lines[i + j].match(/^\d{10,15}$/)) {
          accountNumber = lines[i + j].slice(-4);
          break;
        }
      }
      if (accountNumber === "UNKNOWN") {
        const accMatch = line.match(/Account Number\s*:\s*(\d+)/i) || line.match(/Account\s*Number.*?(\d+)/i);
        if (accMatch) {
          accountNumber = accMatch[1].slice(-4);
        }
      }
    }

    // 2. Period
    if (line.includes("Statement From :")) {
      const periodMatch = line.match(/Statement From\s*:\s*([\d/-]+)\s*to\s*([\d/-]+)/i);
      if (periodMatch) {
        duration = `${periodMatch[1]} to ${periodMatch[2]}`;
        const parts = periodMatch[1].split("-");
        if (parts.length === 3) {
          month = `${parts[2]}-${parts[1]}`;
        } else {
          const slashParts = periodMatch[1].split("/");
          if (slashParts.length === 3) {
            month = `${slashParts[2]}-${slashParts[1]}`;
          }
        }
      }
    }

    // 3. Detect transactions
    // Updated regex to handle layout reconstruction with particulars in the same line
    const match = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(\S+)\s+(\S+)\s+(\S+)\s+([\d,.-]+)$/);
    if (match) {
      if (!inTransactions) inTransactions = true;
      if (currentTxn) {
        rawTxns.push(currentTxn);
      }

      const date = match[1];
      const particulars = match[3];
      const chq = match[4];
      const val1 = match[5]; // Debit or -
      const val2 = match[6]; // Credit or -
      const balVal = match[7]; // Balance

      let amount = 0;
      let type: "DEBIT" | "CREDIT" = "DEBIT";

      if (val1 !== "-" && val2 === "-") {
        amount = parseFloat(val1.replace(/,/g, ""));
        type = "DEBIT";
      } else if (val1 === "-" && val2 !== "-") {
        amount = parseFloat(val2.replace(/,/g, ""));
        type = "CREDIT";
      } else {
        amount = parseFloat(val1.replace(/,/g, "")) || 0;
        type = "DEBIT";
      }

      const balance = parseFloat(balVal.replace(/,/g, ""));

      currentTxn = {
        date,
        particulars,
        amount,
        balance,
        type,
      };
    } else if (inTransactions) {
      if (line.includes("Statement Summary") || line.includes("Closing Balance") || line.includes("Please do not share")) {
        inTransactions = false;
        if (currentTxn) {
          rawTxns.push(currentTxn);
          currentTxn = null;
        }
        continue;
      }

      if (currentTxn) {
        const clean = line.trim();
        if (
          clean !== "WDL TFR" &&
          clean !== "DEP TFR" &&
          clean !== "Balance" &&
          !clean.startsWith("Page no.") &&
          !clean.startsWith("STATEMENT OF ACCOUNT")
        ) {
          currentTxn.particulars += (currentTxn.particulars ? " " : "") + clean;
        }
      }
    }
  }

  if (currentTxn) {
    rawTxns.push(currentTxn);
  }

  if (rawTxns.length === 0) return null;

  const firstTxn = rawTxns[0];
  let openingBalance = 0;
  if (firstTxn.type === "DEBIT") {
    openingBalance = firstTxn.balance + firstTxn.amount;
  } else {
    openingBalance = firstTxn.balance - firstTxn.amount;
  }

  const transactions: ParsedTransaction[] = [];
  let totalSpent = 0;
  let totalReceived = 0;

  rawTxns.forEach((txn, index) => {
    if (txn.type === "DEBIT") {
      totalSpent += txn.amount;
    } else {
      totalReceived += txn.amount;
    }

    transactions.push({
      id: `${txn.date}-${index}`,
      date: txn.date,
      description: txn.particulars,
      amount: txn.amount,
      type: txn.type,
      balance: txn.balance,
      category: autoCategorize(txn.particulars, txn.type),
    });
  });

  const closingBalance = transactions[transactions.length - 1].balance;

  return {
    accountNumber,
    month,
    duration,
    startingBalance: openingBalance,
    closingBalance,
    totalSpent,
    totalReceived,
    transactions,
  };
}

// Delete a bank account and all its statements (cascade deleted by schema)
export async function deleteBankAccount(id: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  // Verify the account belongs to the user
  const account = await prisma.bankAccount.findFirst({
    where: { id, userId },
  });

  if (!account) throw new Error("Account not found");

  await prisma.bankAccount.delete({
    where: { id },
  });

  revalidatePath("/money-management");
  revalidatePath("/dashboard");
  return { success: true };
}

// Update a bank account's details
export async function updateBankAccount(
  id: string,
  bankName: string,
  accountNumber: string
) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  // Verify the account belongs to the user
  const account = await prisma.bankAccount.findFirst({
    where: { id, userId },
  });

  if (!account) throw new Error("Account not found");

  try {
    const updated = await prisma.bankAccount.update({
      where: { id },
      data: {
        bankName: bankName.toUpperCase(),
        accountNumber: accountNumber.trim(),
      },
    });

    revalidatePath("/money-management");
    revalidatePath("/dashboard");
    return { success: true, account: updated };
  } catch (err: any) {
    if (err.code === "P2002") {
      throw new Error("A bank account with this bank and account number already exists.");
    }
    throw err;
  }
}
