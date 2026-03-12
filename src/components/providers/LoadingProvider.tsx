"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, Suspense } from "react";
import { usePathname } from "next/navigation";

interface LoadingContextType {
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    loadingText: string;
    setLoadingText: (text: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

function PathnameWatcher({ onPathChange }: { onPathChange: () => void }) {
    const pathname = usePathname();
    useEffect(() => {
        onPathChange();
    }, [pathname, onPathChange]);
    return null;
}

export function LoadingProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");

    const handlePathChange = React.useCallback(() => {
        setIsLoading(false);
    }, []);

    const value = useMemo(() => ({
        isLoading,
        setIsLoading,
        loadingText,
        setLoadingText
    }), [isLoading, loadingText]);

    return (
        <LoadingContext.Provider value={value}>
            <Suspense fallback={null}>
                <PathnameWatcher onPathChange={handlePathChange} />
            </Suspense>
            {children}
        </LoadingContext.Provider>
    );
}

export function useLoading() {
    const context = useContext(LoadingContext);
    if (context === undefined) {
        throw new Error("useLoading must be used within a LoadingProvider");
    }
    return context;
}
