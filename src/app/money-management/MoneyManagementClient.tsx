"use client";

import { useState, useMemo, useRef } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Upload,
  Key,
  Save,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  PieChart as PieIcon,
  ChevronRight,
  Sparkles,
  RefreshCw,
  PlusCircle,
  X,
  Pencil
} from "lucide-react";
import {
  uploadBankStatement,
  saveBankStatement,
  deleteBankStatement,
  addManualAccount,
  deleteBankAccount,
  updateBankAccount,
} from "@/app/actions/money-management";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "DEBIT" | "CREDIT";
  balance: number;
  category: string;
}

interface BankStatement {
  id: string;
  bankAccountId: string;
  month: string; // "YYYY-MM"
  duration: string | null;
  startingBalance: number;
  closingBalance: number;
  totalSpent: number;
  totalReceived: number;
  transactions: any; // JSON array of ParsedTransaction
  createdAt: Date;
  updatedAt: Date;
}

interface BankAccount {
  id: string;
  userId: string;
  bankName: string;
  accountNumber: string;
  statements: BankStatement[];
  createdAt: Date;
}

const SUPPORTED_BANKS = [
  { value: "KOTAK", label: "Kotak Mahindra Bank" },
  { value: "BOB", label: "Bank of Baroda" },
  { value: "AXIS", label: "Axis Bank" },
  { value: "SBI", label: "State Bank of India" },
];

const STANDARD_CATEGORIES = [
  "Salary/Income",
  "Income",
  "Groceries",
  "Food/Dining",
  "Investments",
  "Rent",
  "Bills/Utilities",
  "Charges/Fees",
  "Transfer",
  "Shopping/Others",
];

const CHART_COLORS = [
  "#22c55e", // Green
  "#3b82f6", // Blue
  "#f43f5e", // Rose
  "#eab308", // Yellow
  "#a855f7", // Purple
  "#ec4899", // Pink
  "#f97316", // Orange
  "#06b6d4", // Cyan
  "#14b8a6", // Teal
  "#84cc16", // Lime
];

export default function MoneyManagementClient({
  initialBankAccounts,
}: {
  initialBankAccounts: BankAccount[];
}) {
  const [accounts, setAccounts] = useState<BankAccount[]>(initialBankAccounts);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts.length > 0 ? "consolidated" : ""
  );
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  // Modals / Dialogs states
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [editAccountOpen, setEditAccountOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  
  // Account Form state
  const [newAccData, setNewAccData] = useState({ bankName: "SBI", accountNumber: "" });
  const [editAccData, setEditAccData] = useState({ id: "", bankName: "SBI", accountNumber: "" });
  
  // Upload State
  const [uploadData, setUploadData] = useState({
    bankName: "SBI",
    file: null as File | null,
    password: "",
  });
  const [isUploading, setIsUploading] = useState(false);
  const [pendingBase64, setPendingBase64] = useState<string | null>(null);

  // Manual Statement Creation State
  const [isManualCreating, setIsManualCreating] = useState(false);

  // Excel Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editedStartingBalance, setEditedStartingBalance] = useState<number>(0);
  const [editedTransactions, setEditedTransactions] = useState<ParsedTransaction[]>([]);
  const [editedDuration, setEditedDuration] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Find all unique months across all bank statements
  const consolidatedMonths = useMemo(() => {
    const months = new Set<string>();
    accounts.forEach((acc) => {
      acc.statements.forEach((stmt) => {
        months.add(stmt.month);
      });
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [accounts]);

  // Find active account and active statement
  const activeAccount = useMemo(() => {
    if (selectedAccountId === "consolidated") return null;
    return accounts.find((a) => a.id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  const activeMonth = useMemo(() => {
    if (selectedMonth) return selectedMonth;
    if (selectedAccountId === "consolidated") {
      return consolidatedMonths[0] || "";
    }
    if (!activeAccount || activeAccount.statements.length === 0) return "";
    return activeAccount.statements[0].month;
  }, [selectedAccountId, activeAccount, selectedMonth, consolidatedMonths]);

  const activeStatement = useMemo(() => {
    if (!activeAccount || activeAccount.statements.length === 0) return null;
    if (selectedMonth) {
      return activeAccount.statements.find((s) => s.month === selectedMonth) || activeAccount.statements[0];
    }
    return activeAccount.statements[0];
  }, [activeAccount, selectedMonth]);

  // Computed consolidated statement for consolidated view
  const consolidatedStatement = useMemo(() => {
    if (selectedAccountId !== "consolidated" || !activeMonth) return null;

    const statementsForMonth = accounts
      .map((acc) => acc.statements.find((s) => s.month === activeMonth))
      .filter((s): s is BankStatement => !!s);

    if (statementsForMonth.length === 0) return null;

    let startingBalance = 0;
    let closingBalance = 0;
    let totalSpent = 0;
    let totalReceived = 0;
    let transactions: ParsedTransaction[] = [];

    statementsForMonth.forEach((stmt) => {
      startingBalance += stmt.startingBalance;
      closingBalance += stmt.closingBalance;
      totalSpent += stmt.totalSpent;
      totalReceived += stmt.totalReceived;

      const txs = typeof stmt.transactions === "string"
        ? JSON.parse(stmt.transactions)
        : stmt.transactions;

      if (Array.isArray(txs)) {
        const bankName = accounts.find((a) => a.id === stmt.bankAccountId)?.bankName || "Unknown";
        const mappedTxs = txs.map((tx: any) => ({
          ...tx,
          description: `[${bankName}] ${tx.description}`,
        }));
        transactions = transactions.concat(mappedTxs);
      }
    });

    const parseDateStr = (dateStr: string) => {
      const cleanStr = dateStr.replace(/-/g, "/").trim();
      const parts = cleanStr.split("/");
      if (parts.length === 3) {
        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
      }
      const spaceParts = cleanStr.split(" ");
      if (spaceParts.length === 3) {
        const monthsMap: Record<string, number> = {
          jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
          jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
        };
        const m = monthsMap[spaceParts[1].toLowerCase().slice(0, 3)] ?? 0;
        return new Date(Number(spaceParts[2]), m, Number(spaceParts[0])).getTime();
      }
      return 0;
    };

    transactions.sort((a, b) => parseDateStr(b.date) - parseDateStr(a.date));

    return {
      id: "consolidated",
      bankAccountId: "consolidated",
      month: activeMonth,
      duration: `Consolidated for ${activeMonth}`,
      startingBalance,
      closingBalance,
      totalSpent,
      totalReceived,
      transactions,
    };
  }, [selectedAccountId, activeMonth, accounts]);

  const displayStatement = selectedAccountId === "consolidated" ? consolidatedStatement : activeStatement;

  // Set up values for editing
  const enterEditMode = () => {
    if (!activeStatement) {
      // Initialize a fresh empty statement
      const today = new Date();
      const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
      setEditedStartingBalance(0);
      setEditedDuration("");
      setEditedTransactions([
        {
          id: "manual-1",
          date: new Date().toLocaleDateString("en-GB").replace(/\//g, "-"),
          description: "Opening Entry",
          amount: 0,
          type: "CREDIT",
          balance: 0,
          category: "Income",
        },
      ]);
      setSelectedMonth(currentMonth);
    } else {
      setEditedStartingBalance(activeStatement.startingBalance);
      setEditedDuration(activeStatement.duration || "");
      const txs = typeof activeStatement.transactions === "string" 
        ? JSON.parse(activeStatement.transactions) 
        : activeStatement.transactions;
      setEditedTransactions(txs || []);
    }
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setIsManualCreating(false);
  };

  // Math for current editing statement
  const computedMetrics = useMemo(() => {
    if (selectedAccountId === "consolidated") {
      if (!consolidatedStatement) return { totalSpent: 0, totalReceived: 0, closingBalance: 0 };
      return {
        totalSpent: consolidatedStatement.totalSpent,
        totalReceived: consolidatedStatement.totalReceived,
        closingBalance: consolidatedStatement.closingBalance,
      };
    }

    if (!isEditing) {
      if (!activeStatement) return { totalSpent: 0, totalReceived: 0, closingBalance: 0 };
      const txs = typeof activeStatement.transactions === "string" 
        ? JSON.parse(activeStatement.transactions) 
        : activeStatement.transactions;
      const credits = (txs || []).reduce((sum: number, t: any) => sum + (t.type === "CREDIT" ? t.amount : 0), 0);
      const debits = (txs || []).reduce((sum: number, t: any) => sum + (t.type === "DEBIT" ? t.amount : 0), 0);
      return {
        totalSpent: debits,
        totalReceived: credits,
        closingBalance: activeStatement.startingBalance + credits - debits,
      };
    }

    const credits = editedTransactions.reduce((sum, t) => sum + (t.type === "CREDIT" ? t.amount : 0), 0);
    const debits = editedTransactions.reduce((sum, t) => sum + (t.type === "DEBIT" ? t.amount : 0), 0);
    
    // Auto-calculate progressive balances
    let currentBalance = editedStartingBalance;
    const progressiveTxs = editedTransactions.map((tx) => {
      if (tx.type === "CREDIT") {
        currentBalance += tx.amount;
      } else {
        currentBalance -= tx.amount;
      }
      return { ...tx, balance: Number(currentBalance.toFixed(2)) };
    });

    return {
      totalSpent: debits,
      totalReceived: credits,
      closingBalance: Number((editedStartingBalance + credits - debits).toFixed(2)),
      progressiveTxs,
    };
  }, [selectedAccountId, consolidatedStatement, isEditing, editedStartingBalance, editedTransactions, activeStatement]);

  // Handle cell updates in Excel view
  const updateCell = (index: number, key: keyof ParsedTransaction, value: any) => {
    const updated = [...editedTransactions];
    if (key === "amount") {
      updated[index] = { ...updated[index], amount: parseFloat(value) || 0 };
    } else {
      updated[index] = { ...updated[index], [key]: value };
    }
    setEditedTransactions(updated);
  };

  const addRow = () => {
    const lastTx = editedTransactions[editedTransactions.length - 1];
    const newTx: ParsedTransaction = {
      id: `manual-${Date.now()}-${editedTransactions.length}`,
      date: lastTx?.date || new Date().toLocaleDateString("en-GB").replace(/\//g, "-"),
      description: "",
      amount: 0,
      type: "DEBIT",
      balance: 0,
      category: "Shopping/Others",
    };
    setEditedTransactions([...editedTransactions, newTx]);
  };

  const deleteRow = (index: number) => {
    if (editedTransactions.length === 1) {
      toast.error("At least one transaction is required.");
      return;
    }
    setEditedTransactions(editedTransactions.filter((_, i) => i !== index));
  };

  // Add a new Bank Account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccData.accountNumber.trim()) {
      toast.error("Please enter account number.");
      return;
    }
    try {
      const account = await addManualAccount(newAccData.bankName, newAccData.accountNumber);
      toast.success("Bank Account added successfully");
      const updatedAccounts = [...accounts, { ...account, statements: [] }];
      setAccounts(updatedAccounts);
      setSelectedAccountId(account.id);
      setAddAccountOpen(false);
      setNewAccData({ bankName: "SBI", accountNumber: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    }
  };

  // Trigger PDF file reading and parsing
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadData(prev => ({ ...prev, file, password: "" }));
    setPendingBase64(null);
  };

  const handleUploadOpenChange = (open: boolean) => {
    setUploadOpen(open);
    if (!open && !passwordOpen) {
      setUploadData(prev => ({ ...prev, file: null, password: "" }));
      setPendingBase64(null);
    }
  };

  const handlePasswordOpenChange = (open: boolean) => {
    setPasswordOpen(open);
    if (!open) {
      setUploadData(prev => ({ ...prev, file: null, password: "" }));
      setPendingBase64(null);
    }
  };

  const executeUpload = async (pwd?: string) => {
    if (!uploadData.file) return;
    setIsUploading(true);
    
    const uploadPassword = pwd || uploadData.password;

    const performUpload = async (base64: string) => {
      try {
        const res = await uploadBankStatement(
          uploadData.bankName,
          base64,
          uploadPassword || undefined
        );

        if (res.success && res.statement) {
          toast.success("Statement parsed and saved successfully!");
          
          // Refresh localized state
          window.location.reload();
        } else if (res.error === "PASSWORD_REQUIRED") {
          // Store the base64 to retry once user provides the password
          setPendingBase64(base64);
          setPasswordOpen(true);
          setUploadOpen(false);
          if (res.message.includes("Incorrect")) {
            toast.error("Incorrect password. Please try again.");
          } else {
            toast.info("Password required to decrypt PDF.");
          }
        } else {
          toast.error(res.message || "Failed to parse statement");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      } finally {
        setIsUploading(false);
      }
    };

    if (pendingBase64) {
      await performUpload(pendingBase64);
    } else {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(",")[1];
        await performUpload(base64);
      };
      reader.readAsDataURL(uploadData.file);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordOpen(false);
    await executeUpload(uploadData.password);
  };

  // Save edits (both PDF updates and manual additions)
  const handleSaveEdits = async () => {
    if (!activeAccount) return;
    
    let monthToSave = selectedMonth;
    if (!monthToSave) {
      const today = new Date();
      monthToSave = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    }

    const payload = {
      month: monthToSave,
      duration: editedDuration,
      startingBalance: editedStartingBalance,
      closingBalance: computedMetrics.closingBalance,
      totalSpent: computedMetrics.totalSpent,
      totalReceived: computedMetrics.totalReceived,
      transactions: computedMetrics.progressiveTxs || editedTransactions,
    };

    toast.promise(
      (async () => {
        const stmtId = activeStatement?.month === monthToSave ? activeStatement.id : null;
        const res = await saveBankStatement(activeAccount.id, stmtId, payload);
        
        // Refresh local data
        window.location.reload();
        return res;
      })(),
      {
        loading: "Saving changes...",
        success: "Statement saved successfully!",
        error: (err) => err.message || "Failed to save statement",
      }
    );
  };

  const handleDeleteStatement = async () => {
    if (!activeStatement) return;
    if (!confirm("Are you sure you want to delete this statement? This will clear all transactions for this month.")) return;

    toast.promise(
      (async () => {
        await deleteBankStatement(activeStatement.id);
        window.location.reload();
      })(),
      {
        loading: "Deleting statement...",
        success: "Statement deleted",
        error: "Failed to delete statement",
      }
    );
  };

  const handleEditAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAccData.accountNumber.trim()) {
      toast.error("Please enter account number.");
      return;
    }
    
    toast.promise(
      (async () => {
        const res = await updateBankAccount(editAccData.id, editAccData.bankName, editAccData.accountNumber);
        window.location.reload();
        return res;
      })(),
      {
        loading: "Updating account...",
        success: "Account updated successfully!",
        error: (err: any) => err.message || "Failed to update account",
      }
    );
    setEditAccountOpen(false);
  };

  const handleDeleteAccount = async (id: string, bankName: string, accountNumber: string) => {
    if (!confirm(`Are you sure you want to delete the bank account ${bankName} (xxxx ${accountNumber})? This will also delete all associated statement history.`)) {
      return;
    }

    toast.promise(
      (async () => {
        const res = await deleteBankAccount(id);
        if (selectedAccountId === id) {
          setSelectedAccountId("consolidated");
        }
        window.location.reload();
        return res;
      })(),
      {
        loading: "Deleting account...",
        success: "Account and statements deleted successfully.",
        error: (err: any) => err.message || "Failed to delete account",
      }
    );
  };

  // Recharts Data preparation
  const categoryData = useMemo(() => {
    if (!displayStatement) return [];
    const txs = typeof displayStatement.transactions === "string"
      ? JSON.parse(displayStatement.transactions)
      : displayStatement.transactions;
    if (!txs || txs.length === 0) return [];

    const map: Record<string, number> = {};
    txs.forEach((t: any) => {
      if (t.type === "DEBIT") {
        const cat = t.category || "Shopping/Others";
        map[cat] = (map[cat] || 0) + t.amount;
      }
    });

    return Object.keys(map).map((name) => ({
      name,
      value: Number(map[name].toFixed(2)),
    }));
  }, [displayStatement]);

  const monthlyHistoryData = useMemo(() => {
    if (selectedAccountId === "consolidated") {
      const historyMap: Record<string, { Spent: number; Received: number; Balance: number }> = {};
      accounts.forEach((acc) => {
        acc.statements.forEach((s) => {
          if (!historyMap[s.month]) {
            historyMap[s.month] = { Spent: 0, Received: 0, Balance: 0 };
          }
          historyMap[s.month].Spent += s.totalSpent;
          historyMap[s.month].Received += s.totalReceived;
          historyMap[s.month].Balance += s.closingBalance;
        });
      });

      return Object.keys(historyMap)
        .sort((a, b) => a.localeCompare(b))
        .map((month) => ({
          month,
          Spent: Number(historyMap[month].Spent.toFixed(2)),
          Received: Number(historyMap[month].Received.toFixed(2)),
          Balance: Number(historyMap[month].Balance.toFixed(2)),
        }));
    }

    if (!activeAccount) return [];
    return [...activeAccount.statements]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((s) => ({
        month: s.month,
        Spent: s.totalSpent,
        Received: s.totalReceived,
        Balance: s.closingBalance,
      }));
  }, [selectedAccountId, activeAccount, accounts]);

  const currentStartingBalance = isEditing ? editedStartingBalance : (displayStatement?.startingBalance || 0);
  const netSavings = computedMetrics.closingBalance - currentStartingBalance;

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gradient">Money Management</h1>
          <p className="text-sm text-muted-foreground">Upload statement PDFs to automatically sync and visualize your finances.</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="glass-card border-white/10 text-xs h-9">
                <Plus className="h-4 w-4 mr-1.5" />
                Add Bank Account
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-white/10 sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="text-lg">Add Bank Account</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateAccount} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Select Bank</Label>
                  <Select
                    value={newAccData.bankName}
                    onValueChange={(val) => setNewAccData({ ...newAccData, bankName: val })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Select Bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_BANKS.map((b) => (
                        <SelectItem key={b.value} value={b.value}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Account Number (Last 4 Digits)</Label>
                  <Input
                    placeholder="e.g. 3028"
                    maxLength={4}
                    value={newAccData.accountNumber}
                    onChange={(e) => setNewAccData({ ...newAccData, accountNumber: e.target.value.replace(/\D/g, "") })}
                    className="bg-white/5 border-white/10 h-10"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">Only enter the last 4 digits for verification/privacy.</p>
                </div>
                <Button type="submit" className="w-full bg-gradient-primary glow-primary mt-2">
                  Create Account
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={uploadOpen} onOpenChange={handleUploadOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-primary glow-primary text-xs h-9" disabled={accounts.length === 0}>
                <Upload className="h-4 w-4 mr-1.5" />
                Upload Statement
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-white/10 sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle className="text-lg">Upload Bank Statement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Select Bank Account</Label>
                  <Select
                    value={uploadData.bankName}
                    onValueChange={(val) => setUploadData({ ...uploadData, bankName: val })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Select Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.bankName}>
                          {acc.bankName} (xxxx{acc.accountNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Select PDF File</Label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 hover:border-primary/50 transition-colors rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-white/5"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".pdf"
                      onChange={handleUploadFile}
                      className="hidden"
                    />
                    <Upload className="h-8 w-8 text-muted-foreground animate-bounce" />
                    <p className="text-xs font-bold text-primary-foreground">
                      {uploadData.file ? uploadData.file.name : "Click to select bank statement PDF"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">PDF file should contain transactions from April or any other month</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Password (If password-protected)</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Optional password"
                      value={uploadData.password}
                      onChange={(e) => setUploadData({ ...uploadData, password: e.target.value })}
                      className="bg-white/5 border-white/10 pl-10 h-10 text-sm"
                    />
                  </div>
                </div>

                <Button
                  onClick={() => executeUpload()}
                  className="w-full bg-gradient-primary glow-primary mt-2"
                  disabled={isUploading || !uploadData.file}
                >
                  {isUploading ? "Uploading & Parsing..." : "Upload & Sync"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {accounts.length === 0 ? (
        <GlassCard className="p-16 text-center border-white/5 flex flex-col items-center justify-center gap-4">
          <Wallet className="h-16 w-16 opacity-20" />
          <h3 className="text-lg font-bold">No Bank Accounts Found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            To get started with Money Management, please add a bank account first, then upload a statement.
          </p>
          <Button onClick={() => setAddAccountOpen(true)} className="bg-gradient-primary">
            Add Your First Account
          </Button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel: Bank Accounts & Month Selection */}
          <div className="space-y-4 lg:col-span-1">
            <GlassCard className="p-4 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Select Bank Account</h3>
              </div>
              <div className="space-y-2">
                {accounts.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedAccountId("consolidated");
                      setSelectedMonth("");
                      setIsEditing(false);
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between",
                      selectedAccountId === "consolidated"
                        ? "bg-primary/10 border-primary text-primary-foreground font-bold shadow-md shadow-primary/5 scale-[1.02]"
                        : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10 hover:text-primary-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-500 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-black font-sans">All Accounts</p>
                        <p className="text-[10px] opacity-70">Consolidated Summary</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </button>
                )}

                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    onClick={() => {
                      setSelectedAccountId(acc.id);
                      setSelectedMonth("");
                      setIsEditing(false);
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer group",
                      selectedAccountId === acc.id
                        ? "bg-primary/10 border-primary text-primary-foreground font-bold shadow-md shadow-primary/5 scale-[1.02]"
                        : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10 hover:text-primary-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                        <Wallet className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-black">{acc.bankName}</p>
                        <p className="text-[10px] opacity-70">xxxx {acc.accountNumber}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditAccData({ id: acc.id, bankName: acc.bankName, accountNumber: acc.accountNumber });
                          setEditAccountOpen(true);
                        }}
                        className="h-6 w-6 rounded hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-primary-foreground transition-all opacity-0 group-hover:opacity-100"
                        title="Edit Account Details"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAccount(acc.id, acc.bankName, acc.accountNumber);
                        }}
                        className="h-6 w-6 rounded hover:bg-rose-500/10 flex items-center justify-center text-muted-foreground hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100"
                        title="Delete Bank Account"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <ChevronRight className="h-4 w-4 opacity-50 group-hover:hidden" />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {selectedAccountId === "consolidated" && consolidatedMonths.length > 0 && (
              <GlassCard className="p-4 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Select Statement Month</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {consolidatedMonths.map((m) => {
                    const dateParts = m.split("-");
                    const date = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, 1);
                    const label = date.toLocaleString("en-US", { month: "short", year: "numeric" });
                    
                    return (
                      <button
                        key={m}
                        onClick={() => {
                          setSelectedMonth(m);
                          setIsEditing(false);
                        }}
                        className={cn(
                          "p-2 rounded-lg text-xs text-center border font-bold transition-all",
                          activeMonth === m
                            ? "bg-primary/20 border-primary text-primary-foreground"
                            : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </GlassCard>
            )}

            {activeAccount && activeAccount.statements.length > 0 && (
              <GlassCard className="p-4 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Select Statement Month</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {activeAccount.statements.map((s) => {
                    // Convert "2026-04" to "April 2026"
                    const dateParts = s.month.split("-");
                    const date = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, 1);
                    const label = date.toLocaleString("en-US", { month: "short", year: "numeric" });
                    
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedMonth(s.month);
                          setIsEditing(false);
                        }}
                        className={cn(
                          "p-2 rounded-lg text-xs text-center border font-bold transition-all",
                          (selectedMonth === s.month || (!selectedMonth && activeAccount.statements[0].id === s.id))
                            ? "bg-primary/20 border-primary text-primary-foreground"
                            : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </GlassCard>
            )}

            {activeAccount && (
              <GlassCard className="p-4 flex flex-col gap-2">
                <Button
                  onClick={enterEditMode}
                  variant="outline"
                  className="w-full text-xs h-9 glass-card border-white/10"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1.5 text-accent" />
                  {activeStatement ? "Edit Current Sheet" : "Create Manual Sheet"}
                </Button>
                {activeStatement && (
                  <Button
                    onClick={handleDeleteStatement}
                    variant="outline"
                    className="w-full text-xs h-9 text-destructive hover:bg-destructive/5 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete Month Data
                  </Button>
                )}
              </GlassCard>
            )}
          </div>

          {/* Right Panel: Data Summary, Visualizations & Excel Grid */}
          <div className="lg:col-span-3 space-y-6">
            {/* active statement details */}
            {displayStatement || isEditing ? (
              <>
                {/* Visual Dashboard Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <GlassCard className="p-4 bg-white/[0.02]">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Starting Balance</p>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editedStartingBalance}
                        onChange={(e) => setEditedStartingBalance(parseFloat(e.target.value) || 0)}
                        className="bg-white/5 border-white/10 h-7 mt-1 text-sm text-primary-foreground font-black font-mono"
                      />
                    ) : (
                      <p className="text-xl font-black font-mono tracking-tight mt-1 text-primary-foreground">
                        ₹{(displayStatement?.startingBalance || 0).toLocaleString()}
                      </p>
                    )}
                  </GlassCard>

                  <GlassCard className="p-4 bg-white/[0.02] border-l-2 border-l-green-500">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                      Total Received <ArrowUpRight className="h-3 w-3 text-green-500" />
                    </p>
                    <p className="text-xl font-black font-mono tracking-tight mt-1 text-green-400">
                      ₹{computedMetrics.totalReceived.toLocaleString()}
                    </p>
                  </GlassCard>

                  <GlassCard className="p-4 bg-white/[0.02] border-l-2 border-l-rose-500">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                      Total Spent <ArrowDownRight className="h-3 w-3 text-rose-500" />
                    </p>
                    <p className="text-xl font-black font-mono tracking-tight mt-1 text-rose-400">
                      ₹{computedMetrics.totalSpent.toLocaleString()}
                    </p>
                  </GlassCard>

                  {/* Net Savings Widget Card */}
                  <GlassCard 
                    className={cn(
                      "p-4 bg-white/[0.02] border-l-2",
                      netSavings >= 0 ? "border-l-emerald-500" : "border-l-rose-500"
                    )}
                  >
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                      Net Savings 
                      {netSavings >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-rose-400" />
                      )}
                    </p>
                    <p 
                      className={cn(
                        "text-xl font-black font-mono tracking-tight mt-1",
                        netSavings >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      {netSavings >= 0 ? "+" : ""}
                      ₹{netSavings.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 truncate font-sans">
                      ₹{currentStartingBalance.toLocaleString()} → ₹{computedMetrics.closingBalance.toLocaleString()}
                    </p>
                  </GlassCard>

                  <GlassCard className="p-4 bg-white/[0.02] border-l-2 border-l-primary">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Closing Balance</p>
                    <p className="text-xl font-black font-mono tracking-tight mt-1 text-primary">
                      ₹{computedMetrics.closingBalance.toLocaleString()}
                    </p>
                  </GlassCard>
                </div>

                {/* Duration Label */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-2">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-bold">Period: </span>
                    {isEditing ? (
                      <Input
                        value={editedDuration}
                        placeholder="e.g. 01-Apr-2026 to 30-Apr-2026"
                        onChange={(e) => setEditedDuration(e.target.value)}
                        className="bg-white/5 border-white/10 h-7 text-xs w-64 inline-block ml-2"
                      />
                    ) : (
                      displayStatement?.duration || "N/A"
                    )}
                  </div>
                  {isEditing && (
                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                      <Label className="text-xs">Month Selector:</Label>
                      <Input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-white/5 border-white/10 h-7 text-xs w-36"
                      />
                    </div>
                  )}
                </div>

                {/* Analytical Visuals */}
                {!isEditing && displayStatement && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Category pie chart */}
                    <GlassCard className="p-4 space-y-4">
                      <h3 className="text-sm font-black flex items-center gap-2">
                        <PieIcon className="h-4 w-4 text-accent" />
                        {(() => {
                          const dateParts = displayStatement.month.split("-");
                          const date = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, 1);
                          return date.toLocaleString("en-US", { month: "long" });
                        })()} Expense Categories
                      </h3>
                      <div className="h-[200px] flex items-center justify-center">
                        {categoryData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                innerRadius={40}
                                outerRadius={70}
                                paddingAngle={2}
                                dataKey="value"
                              >
                                {categoryData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => `₹${value}`} />
                              <Legend verticalAlign="bottom" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="text-xs text-muted-foreground opacity-50 flex flex-col items-center gap-1">
                            <Sparkles className="h-6 w-6" />
                            No debit transactions found to categorize.
                          </div>
                        )}
                      </div>
                    </GlassCard>

                    {/* Historical Trends */}
                    <GlassCard className="p-4 space-y-4">
                      <h3 className="text-sm font-black flex items-center gap-2">
                        <PlusCircle className="h-4 w-4 text-primary" />
                        Cashflow & Balances
                      </h3>
                      <div className="h-[200px] flex items-center justify-center">
                        {monthlyHistoryData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyHistoryData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={9} />
                              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={9} />
                              <Tooltip formatter={(value) => `₹${value}`} />
                              <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                              <Bar dataKey="Received" fill="#22c55e" radius={[2, 2, 0, 0]} />
                              <Bar dataKey="Spent" fill="#f43f5e" radius={[2, 2, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="text-xs text-muted-foreground opacity-50">Need more statements to plot trend.</div>
                        )}
                      </div>
                    </GlassCard>
                  </div>
                )}

                {/* Excel-like Compact Grid Editor */}
                <GlassCard className="overflow-hidden border-white/5 space-y-4">
                  <div className="p-4 bg-white/[0.02] border-b border-white/5 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-black flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-green-500" />
                        Spreadsheet View
                      </h3>
                      <p className="text-[10px] text-muted-foreground">Click values to edit. Progressive balances are calculated automatically.</p>
                    </div>
                    
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 text-[10px] px-2.5 font-bold">
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveEdits} className="h-7 bg-gradient-primary text-[10px] px-3 font-bold">
                          <Save className="h-3 w-3 mr-1" />
                          Save Sheet
                        </Button>
                      </div>
                    ) : (
                      selectedAccountId !== "consolidated" && (
                        <Button size="sm" onClick={enterEditMode} className="h-7 bg-white/5 border-white/10 text-[10px] px-3 font-bold">
                          Edit Sheet
                        </Button>
                      )
                    )}
                  </div>

                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.03]">
                          <th className="px-3 py-2 text-[10px] font-black uppercase text-muted-foreground w-28">Date</th>
                          <th className="px-3 py-2 text-[10px] font-black uppercase text-muted-foreground">Particulars / Description</th>
                          <th className="px-3 py-2 text-[10px] font-black uppercase text-muted-foreground w-24">Type</th>
                          <th className="px-3 py-2 text-[10px] font-black uppercase text-muted-foreground w-28">Amount</th>
                          <th className="px-3 py-2 text-[10px] font-black uppercase text-muted-foreground w-28">Balance</th>
                          <th className="px-3 py-2 text-[10px] font-black uppercase text-muted-foreground w-36">Category</th>
                          {isEditing && (
                            <th className="px-3 py-2 text-[10px] font-black uppercase text-muted-foreground text-center w-12">Del</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(isEditing ? computedMetrics.progressiveTxs || editedTransactions : (typeof displayStatement?.transactions === "string" ? JSON.parse(displayStatement.transactions) : displayStatement?.transactions) || []).map((tx: any, idx: number) => (
                          <tr key={tx.id || idx} className="hover:bg-white/[0.01] transition-colors group">
                            {/* Date Cell */}
                            <td className="px-2 py-1.5">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={tx.date}
                                  onChange={(e) => updateCell(idx, "date", e.target.value)}
                                  className="w-full bg-transparent border-transparent hover:border-white/20 focus:border-primary focus:bg-white/5 transition-all px-1.5 py-0.5 rounded border font-mono outline-none"
                                />
                              ) : (
                                <span className="text-muted-foreground font-sans">{tx.date}</span>
                              )}
                            </td>

                            {/* Particulars Cell */}
                            <td className="px-2 py-1.5">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={tx.description}
                                  onChange={(e) => updateCell(idx, "description", e.target.value)}
                                  className="w-full bg-transparent border-transparent hover:border-white/20 focus:border-primary focus:bg-white/5 transition-all px-1.5 py-0.5 rounded border outline-none truncate"
                                />
                              ) : (
                                <span className="text-primary-foreground font-sans line-clamp-1" title={tx.description}>
                                  {tx.description || "N/A"}
                                </span>
                              )}
                            </td>

                            {/* Type Cell */}
                            <td className="px-2 py-1.5">
                              {isEditing ? (
                                <select
                                  value={tx.type}
                                  onChange={(e) => updateCell(idx, "type", e.target.value)}
                                  className="w-full bg-black/60 border border-white/10 hover:border-white/20 focus:border-primary transition-all px-1.5 py-0.5 rounded outline-none font-bold text-[10px]"
                                >
                                  <option value="DEBIT" className="bg-background text-rose-500 font-bold">DR (Spent)</option>
                                  <option value="CREDIT" className="bg-background text-green-500 font-bold">CR (Received)</option>
                                </select>
                              ) : (
                                <span
                                  className={cn(
                                    "font-black text-[9px] px-1 py-0.5 rounded leading-none",
                                    tx.type === "DEBIT"
                                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                      : "bg-green-500/10 text-green-400 border border-green-500/20"
                                  )}
                                >
                                  {tx.type === "DEBIT" ? "DEBIT" : "CREDIT"}
                                </span>
                              )}
                            </td>

                            {/* Amount Cell */}
                            <td className="px-2 py-1.5 text-right font-black">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="any"
                                  value={tx.amount || ""}
                                  onChange={(e) => updateCell(idx, "amount", e.target.value)}
                                  className="w-full text-right bg-transparent border-transparent hover:border-white/20 focus:border-primary focus:bg-white/5 transition-all px-1.5 py-0.5 rounded border outline-none font-mono"
                                />
                              ) : (
                                <span className={tx.type === "DEBIT" ? "text-rose-400" : "text-green-400"}>
                                  ₹{tx.amount.toLocaleString()}
                                </span>
                              )}
                            </td>

                            {/* Balance Cell */}
                            <td className="px-3 py-1.5 text-right text-muted-foreground font-black">
                              ₹{tx.balance.toLocaleString()}
                            </td>

                            {/* Category Cell */}
                            <td className="px-2 py-1.5">
                              {isEditing ? (
                                <select
                                  value={tx.category}
                                  onChange={(e) => updateCell(idx, "category", e.target.value)}
                                  className="w-full bg-black/60 border border-white/10 hover:border-white/20 focus:border-primary transition-all px-1.5 py-0.5 rounded outline-none text-[10px]"
                                >
                                  {STANDARD_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                      {cat}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="bg-white/5 px-1.5 py-0.5 rounded font-sans text-[10px] text-primary-foreground font-medium">
                                  {tx.category || "Shopping/Others"}
                                </span>
                              )}
                            </td>

                            {/* Delete Action Cell */}
                            {isEditing && (
                              <td className="px-2 py-1.5 text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                                  onClick={() => deleteRow(idx)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {isEditing && (
                    <div className="p-3 border-t border-white/5 flex justify-center bg-white/[0.01]">
                      <Button
                        onClick={addRow}
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 border-white/10 bg-white/5 hover:bg-white/10"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Row
                      </Button>
                    </div>
                  )}
                </GlassCard>
              </>
            ) : (
              <GlassCard className="p-16 text-center border-white/5 flex flex-col items-center justify-center gap-4">
                <FileSpreadsheet className="h-16 w-16 opacity-20" />
                <h3 className="text-lg font-bold">No Monthly Statements</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {selectedAccountId === "consolidated"
                    ? "No statements found across any accounts for this month. Select another month or upload statements to individual accounts."
                    : "Please upload a PDF statement for this account or create a manual spreadsheet."}
                </p>
                {selectedAccountId !== "consolidated" && (
                  <Button onClick={enterEditMode} className="bg-gradient-primary">
                    Create Manual Spreadsheet
                  </Button>
                )}
              </GlassCard>
            )}
          </div>
        </div>
      )}

      {/* Decryption password Modal */}
      <Dialog open={passwordOpen} onOpenChange={handlePasswordOpenChange}>
        <DialogContent className="glass-card border-white/10 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Key className="h-5 w-5 text-accent animate-pulse" />
              Decryption Required
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              This statement PDF is encrypted. Please enter the password to unlock it. For SBI bank statement, it is usually a combination of your birthdate/mobile number.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Enter Password</Label>
              <Input
                type="password"
                placeholder="Enter password"
                value={uploadData.password}
                onChange={(e) => setUploadData({ ...uploadData, password: e.target.value })}
                className="bg-white/5 border-white/10 h-10"
                required
              />
            </div>
            <Button type="submit" className="w-full bg-gradient-primary glow-primary mt-2" disabled={isUploading}>
              {isUploading ? "Unlocking & Syncing..." : "Decrypt & Unlock"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Bank Account Modal */}
      <Dialog open={editAccountOpen} onOpenChange={setEditAccountOpen}>
        <DialogContent className="glass-card border-white/10 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg">Edit Bank Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditAccount} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Bank Name</Label>
              <Select
                value={editAccData.bankName}
                onValueChange={(val) => setEditAccData({ ...editAccData, bankName: val })}
              >
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Select Bank" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_BANKS.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Account Number (Last 4 Digits)</Label>
              <Input
                type="text"
                placeholder="e.g. 3028"
                maxLength={4}
                value={editAccData.accountNumber}
                onChange={(e) => setEditAccData({ ...editAccData, accountNumber: e.target.value.replace(/\D/g, "") })}
                className="bg-white/5 border-white/10 h-10"
                required
              />
            </div>
            <Button type="submit" className="w-full bg-gradient-primary glow-primary mt-2">
              Save Changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
