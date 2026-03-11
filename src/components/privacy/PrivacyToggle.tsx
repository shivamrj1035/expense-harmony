"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrivacyStore } from "@/store/privacyStore";
import { PinModal } from "./PinModal";
import { getUserSettings } from "@/app/actions/user";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function PrivacyToggle() {
  const { isPrivacyUnlocked, lock } = usePrivacyStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrivacyEnabled, setIsPrivacyEnabled] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    async function checkSettings() {
      const settings = await getUserSettings();
      setIsPrivacyEnabled(!!settings?.isPrivacyEnabled);
      setNeedsSetup(!settings?.privacyPin);
    }
    checkSettings();
  }, [isModalOpen]);

  const handleToggle = () => {
    if (isPrivacyUnlocked) {
      lock();
    } else {
      setIsModalOpen(true);
    }
  };

  if (!isPrivacyEnabled && !needsSetup) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggle}
              className={cn(
                "h-10 w-10 rounded-xl transition-all duration-300",
                isPrivacyUnlocked
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
              )}
            >
              {isPrivacyUnlocked ? (
                <Eye className="h-5 w-5" />
              ) : (
                <EyeOff className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="glass-card">
            <p className="text-xs font-medium">
              {isPrivacyUnlocked ? "Hide sensitive info" : "Unlock sensitive info"}
            </p>
          </TooltipContent>
        </Tooltip>

        <PinModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          mode={needsSetup ? "setup" : "unlock"}
          onSuccess={() => {
            if (needsSetup) {
              setNeedsSetup(false);
              setIsPrivacyEnabled(true);
            }
          }}
        />
      </div>
    </TooltipProvider>
  );
}
