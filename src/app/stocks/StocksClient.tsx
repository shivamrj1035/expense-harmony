"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Plus,
    Trash2,
    TrendingUp,
    TrendingDown,
    Search,
    RefreshCw,
    Info,
    Edit2,
    FileSpreadsheet,
    Upload
} from "lucide-react";
import { addStock, deleteStock, searchStocks, updateStock, syncStocksFromExcel, refreshPortfolio } from "@/app/actions/stocks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

export default function StocksClient({ initialStocks }: { initialStocks: any[] }) {
    const [stocks, setStocks] = useState(initialStocks);
    const [editingStock, setEditingStock] = useState<any>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [stockToDelete, setStockToDelete] = useState<string | null>(null);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        symbol: "",
        quantity: "",
        avgPrice: "",
    });

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (formData.symbol.length >= 1 && !isAdding) {
                setIsSearching(true);
                const results = await searchStocks(formData.symbol);
                setSearchResults(results);
                setIsSearching(false);
                if (results.length > 0) setSearchOpen(true);
            } else {
                setSearchResults([]);
                setSearchOpen(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [formData.symbol, isAdding]);

    const stats = useMemo(() => {
        const totalInvestment = stocks.reduce((sum, s) => sum + (s.quantity * s.avgPrice), 0);
        const currentValue = stocks.reduce((sum, s) => sum + (s.quantity * s.currentPrice), 0);
        const totalPL = currentValue - totalInvestment;
        const plPercentage = totalInvestment > 0 ? (totalPL / totalInvestment) * 100 : 0;

        return {
            totalInvestment,
            currentValue,
            totalPL,
            plPercentage
        };
    }, [stocks]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refreshPortfolio();
            window.location.href = window.location.pathname + "?refresh=true";
        } catch (error) {
            toast.error("Failed to refresh prices");
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleExcelSync = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsSyncing(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64Data = (event.target?.result as string).split(",")[1];
            try {
                const result = await syncStocksFromExcel(base64Data);
                if (result.success) {
                    toast.success(`Successfully synced ${result.count} stocks from Excel`);
                    window.location.reload();
                }
            } catch (error: any) {
                toast.error(error.message || "Failed to sync stocks from Excel");
            } finally {
                setIsSyncing(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsDataURL(file);
    };

    const handleAddStock = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAdding(true);
        try {
            await addStock({
                symbol: formData.symbol,
                quantity: parseFloat(formData.quantity),
                avgPrice: parseFloat(formData.avgPrice),
            });
            window.location.reload();
            toast.success("Stock added successfully");
            setAddDialogOpen(false);
            setFormData({ symbol: "", quantity: "", avgPrice: "" });
        } catch (error) {
            toast.error("Failed to add stock. Please check the symbol.");
        } finally {
            setIsAdding(false);
        }
    };

    const handleUpdateStock = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAdding(true);
        try {
            await updateStock(editingStock.id, {
                quantity: parseFloat(formData.quantity),
                avgPrice: parseFloat(formData.avgPrice),
            });
            window.location.reload();
            toast.success("Stock updated successfully");
            setEditingStock(null);
            setFormData({ symbol: "", quantity: "", avgPrice: "" });
        } catch (error) {
            toast.error("Failed to update stock");
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteStock = async () => {
        if (!stockToDelete) return;
        try {
            await deleteStock(stockToDelete);
            setStocks(stocks.filter(s => s.id !== stockToDelete));
            toast.success("Stock removed");
            setStockToDelete(null);
        } catch (error) {
            toast.error("Failed to remove stock");
        }
    };

    return (
        <div className="space-y-4 pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Portfolio Analysis</h1>
                    <p className="text-xs text-muted-foreground">Investment status & real-time performance</p>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="glass-card border-white/10 h-8 px-3 text-xs"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isRefreshing && "animate-spin")} />
                        Refresh
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleExcelSync}
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSyncing}
                        className="glass-card border-white/10 h-8 px-3 text-xs"
                    >
                        <FileSpreadsheet className={cn("h-3.5 w-3.5 mr-1.5", isSyncing && "animate-pulse")} />
                        {isSyncing ? "Syncing..." : "Excel Sync"}
                    </Button>
                    <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-gradient-primary glow-primary h-8 px-3 text-xs">
                                <Plus className="h-3.5 w-3.5 mr-1.5" />
                                Add Stock
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="glass-card border-white/10 sm:max-w-[400px]">
                            <DialogHeader>
                                <DialogTitle className="text-lg">Add Stock</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddStock} className="space-y-4 py-2">
                                <div className="space-y-1.5 relative">
                                    <Label className="text-xs">Company Name or Symbol</Label>
                                    <Popover
                                        open={searchOpen}
                                        onOpenChange={setSearchOpen}
                                    >
                                        <PopoverTrigger asChild>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Search (e.g. Reliance, Apple)"
                                                    value={formData.symbol}
                                                    onChange={e => {
                                                        setFormData({ ...formData, symbol: e.target.value });
                                                    }}
                                                    required
                                                    className="bg-white/5 border-white/10 pl-10 h-10 text-sm"
                                                    autoComplete="off"
                                                />
                                                {isSearching && (
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                                        <span className="text-[10px] text-muted-foreground animate-pulse">Searching...</span>
                                                        <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                                                    </div>
                                                )}
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="p-0 border-white/10 glass-card w-[350px]"
                                            align="start"
                                            onOpenAutoFocus={(e) => e.preventDefault()}
                                        >
                                            <Command className="bg-transparent">
                                                <CommandList className="max-h-[200px]">
                                                    <CommandEmpty className="py-2 text-xs text-center">No companies found.</CommandEmpty>
                                                    <CommandGroup heading="Suggestions" className="text-[10px] uppercase font-bold text-muted-foreground px-2">
                                                        {searchResults.map((res) => (
                                                            <CommandItem
                                                                key={res.symbol}
                                                                value={res.symbol}
                                                                onSelect={() => {
                                                                    setFormData({ ...formData, symbol: res.symbol });
                                                                    setSearchOpen(false);
                                                                }}
                                                                className="flex flex-col items-start gap-0.5 py-2 px-3 cursor-pointer hover:bg-white/5 rounded-md"
                                                            >
                                                                <div className="flex justify-between w-full items-center">
                                                                    <span className="font-bold text-sm tracking-tight">{res.symbol}</span>
                                                                    <span className="text-[8px] bg-white/10 px-1 rounded uppercase font-black text-muted-foreground px-1.5 py-0.5">{res.exchDisp}</span>
                                                                </div>
                                                                <span className="text-[10px] text-muted-foreground truncate w-full">{res.name}</span>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Quantity</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            placeholder="0"
                                            value={formData.quantity}
                                            onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                            required
                                            className="bg-white/5 border-white/10 h-10 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Avg. Price</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            placeholder="0.00"
                                            value={formData.avgPrice}
                                            onChange={e => setFormData({ ...formData, avgPrice: e.target.value })}
                                            required
                                            className="bg-white/5 border-white/10 h-10 text-sm"
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full bg-gradient-primary mt-2" disabled={isAdding}>
                                    {isAdding ? "Adding..." : "Add to Portfolio"}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Compact Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <GlassCard className="p-3 bg-white/[0.02]">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Total Invested</p>
                    <p className="text-lg font-black tracking-tight">₹{stats.totalInvestment.toLocaleString()}</p>
                </GlassCard>
                <GlassCard className="p-3 bg-white/[0.02]">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Current Value</p>
                    <p className="text-lg font-black tracking-tight">₹{stats.currentValue.toLocaleString()}</p>
                </GlassCard>
                <GlassCard className={cn("p-3 border-l-2", stats.totalPL >= 0 ? "border-l-accent bg-accent/5" : "border-l-destructive bg-destructive/5")}>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Total P/L</p>
                    <p className={cn("text-lg font-black tracking-tight", stats.totalPL >= 0 ? "text-accent" : "text-destructive")}>
                        {stats.totalPL >= 0 ? "+" : ""}₹{Math.abs(stats.totalPL).toLocaleString()}
                    </p>
                </GlassCard>
                <GlassCard className={cn("p-3 border-l-2", stats.totalPL >= 0 ? "border-l-accent bg-accent/5" : "border-l-destructive bg-destructive/5")}>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">P/L %</p>
                    <p className={cn("text-lg font-black tracking-tight", stats.totalPL >= 0 ? "text-accent" : "text-destructive")}>
                        {stats.plPercentage.toFixed(2)}%
                    </p>
                </GlassCard>
            </div>

            {/* Professional Compact Portfolio Table */}
            <GlassCard className="overflow-hidden border-white/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.03]">
                                <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-1/4">Instrument</th>
                                <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-1/4">Position</th>
                                <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-1/6">Market Price</th>
                                <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-1/6">Returns</th>
                                <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right w-1/6">Adjust</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {stocks.length > 0 ? stocks.map((stock) => {
                                const investment = stock.quantity * stock.avgPrice;
                                const currentVal = stock.quantity * stock.currentPrice;
                                const pl = currentVal - investment;
                                const plPercent = (pl / investment) * 100;

                                return (
                                    <tr key={stock.id} className="hover:bg-white/[0.015] transition-colors group">
                                        <td className="px-4 py-2.5">
                                            <p className="font-bold text-sm tracking-tight text-primary-foreground">{stock.symbol}</p>
                                            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">Avg ₹{stock.avgPrice.toLocaleString()}</p>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <p className="font-bold text-xs">{stock.quantity} Units</p>
                                            <p className="text-[10px] text-muted-foreground">₹{investment.toLocaleString()}</p>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <p className="font-bold text-xs">₹{stock.currentPrice.toLocaleString()}</p>
                                            <div className={cn("flex items-center gap-1 text-[9px] font-black leading-none", stock.change >= 0 ? "text-accent" : "text-destructive")}>
                                                {stock.change >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                                                ₹{Math.abs(stock.change).toFixed(1)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <p className={cn("font-bold text-xs", pl >= 0 ? "text-accent" : "text-destructive")}>
                                                {pl >= 0 ? "+" : ""}₹{Math.abs(pl).toLocaleString()}
                                            </p>
                                            <div className={cn("text-[9px] font-black", pl >= 0 ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive", "inline-block px-1 rounded")}>
                                                {plPercent.toFixed(1)}%
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <div className="flex justify-end gap-0.5">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                                                    onClick={() => {
                                                        setEditingStock(stock);
                                                        setFormData({
                                                            symbol: stock.symbol,
                                                            quantity: stock.quantity.toString(),
                                                            avgPrice: stock.avgPrice.toString()
                                                        });
                                                    }}
                                                >
                                                    <Edit2 className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
                                                    onClick={() => setStockToDelete(stock.id)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={5} className="p-16 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-20">
                                            <Search className="h-10 w-10" />
                                            <p className="text-[10px] font-bold uppercase tracking-widest">Portfolio is Empty</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            {/* Edit Stock Dialog */}
            <Dialog open={!!editingStock} onOpenChange={(open) => !open && setEditingStock(null)}>
                <DialogContent className="glass-card border-white/10 sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="text-lg">Edit Holdings: {editingStock?.symbol}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdateStock} className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Quantity</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    value={formData.quantity}
                                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                    required
                                    className="bg-white/5 border-white/10 h-10 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Avg. Price</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    value={formData.avgPrice}
                                    onChange={e => setFormData({ ...formData, avgPrice: e.target.value })}
                                    required
                                    className="bg-white/5 border-white/10 h-10 text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button type="button" variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={() => setEditingStock(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1 bg-gradient-primary" disabled={isAdding}>
                                {isAdding ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Custom UI Delete Alert */}
            <AlertDialog open={!!stockToDelete} onOpenChange={(open) => {
                if (!open) setStockToDelete(null);
            }}>
                <AlertDialogContent className="glass-card border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Stock?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this stock from your portfolio? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteStock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
