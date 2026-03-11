"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { usePrivacyStore } from "@/store/privacyStore";
import { setupPrivacyPin, verifyPrivacyPin } from "@/app/actions/privacy";
import { toast } from "sonner";
import { Loader2, Lock, ShieldCheck } from "lucide-react";

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "unlock" | "setup";
  onSuccess?: () => void;
}

export function PinModal({ isOpen, onClose, mode, onSuccess }: PinModalProps) {
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const unlock = usePrivacyStore((state) => state.unlock);

  // Clear pin on open/close
  useEffect(() => {
    if (!isOpen) setPin("");
  }, [isOpen]);

  const handleComplete = async (value: string) => {
    setIsLoading(true);
    try {
      if (mode === "setup") {
        await setupPrivacyPin(value);
        toast.success("Privacy PIN set successfully!");
        onSuccess?.();
        onClose();
      } else {
        const { isValid } = await verifyPrivacyPin(value);
        if (isValid) {
          unlock();
          toast.success("Privacy mode unlocked");
          onSuccess?.();
          onClose();
        } else {
          toast.error("Invalid PIN. Please try again.");
          setPin("");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
      setPin("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px] glass-card border-white/20 backdrop-blur-2xl">
        <DialogHeader className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary animate-pulse-slow">
            {mode === "setup" ? (
              <ShieldCheck className="h-8 w-8" />
            ) : (
              <Lock className="h-8 w-8" />
            )}
          </div>
          <div className="space-y-2">
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {mode === "setup" ? "Set Privacy PIN" : "Enter Privacy PIN"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {mode === "setup"
                ? "Create a 4-digit PIN to protect your sensitive financial data."
                : "Enter your 4-digit PIN to view sensitive information."}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-8">
          <InputOTP
            maxLength={4}
            value={pin}
            onChange={(value) => setPin(value)}
            onComplete={handleComplete}
            disabled={isLoading}
            autoFocus
          >
            <InputOTPGroup className="gap-4">
              <InputOTPSlot
                index={0}
                className="h-16 w-14 rounded-2xl border-white/10 bg-white/5 text-2xl font-bold transition-all focus:ring-primary/50"
              />
              <InputOTPSlot
                index={1}
                className="h-16 w-14 rounded-2xl border-white/10 bg-white/5 text-2xl font-bold transition-all focus:ring-primary/50"
              />
              <InputOTPSlot
                index={2}
                className="h-16 w-14 rounded-2xl border-white/10 bg-white/5 text-2xl font-bold transition-all focus:ring-primary/50"
              />
              <InputOTPSlot
                index={3}
                className="h-16 w-14 rounded-2xl border-white/10 bg-white/5 text-2xl font-bold transition-all focus:ring-primary/50"
              />
            </InputOTPGroup>
          </InputOTP>

          {isLoading && (
            <div className="mt-6 flex items-center gap-2 text-sm text-primary animate-in fade-in slide-in-from-top-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
