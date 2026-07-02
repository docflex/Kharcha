"use client";

import { create } from "zustand";

interface AppState {
    /** Currently selected year (shared across Dashboard, Analytics, Expenses, Persona, Upload) */
    year: number;
    /** Currently selected month (shared across Dashboard, Analytics, Expenses, Persona, Upload) */
    month: number;
    /** Set both year and month at once */
    setYearMonth: (year: number, month: number) => void;
    /** Set year only */
    setYear: (year: number) => void;
    /** Set month only */
    setMonth: (month: number) => void;
    /** Navigate to previous month */
    prevMonth: () => void;
    /** Navigate to next month */
    nextMonth: () => void;
}

const now = new Date();

export const useAppStore = create<AppState>((set) => ({
    year: now.getFullYear(),
    month: now.getMonth() + 1,

    setYearMonth: (year, month) => set({ year, month }),

    setYear: (year) => set({ year }),

    setMonth: (month) => set({ month }),

    prevMonth: () =>
        set((state) => {
            if (state.month === 1) {
                return { year: state.year - 1, month: 12 };
            }
            return { month: state.month - 1 };
        }),

    nextMonth: () =>
        set((state) => {
            if (state.month === 12) {
                return { year: state.year + 1, month: 1 };
            }
            return { month: state.month + 1 };
        }),
}));
