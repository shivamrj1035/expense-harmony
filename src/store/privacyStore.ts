import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface PrivacyState {
  isPrivacyUnlocked: boolean;
  unlock: () => void;
  lock: () => void;
}

export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set) => ({
      isPrivacyUnlocked: false,
      unlock: () => set({ isPrivacyUnlocked: true }),
      lock: () => set({ isPrivacyUnlocked: false }),
    }),
    {
      name: "privacy-storage",
      storage: createJSONStorage(() => sessionStorage), // Only for the current tab session
    }
  )
);
