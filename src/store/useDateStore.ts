import { create } from 'zustand';

interface DateState {
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
}

export const useDateStore = create<DateState>((set) => ({
  selectedMonth: new Date(),
  setSelectedMonth: (date) => set({ selectedMonth: date }),
}));
