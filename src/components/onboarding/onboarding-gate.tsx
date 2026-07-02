"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useExpenses } from "@/hooks/use-expenses";
import { useIncome } from "@/hooks/use-income";

const ONBOARDING_COMPLETE_KEY = "kharcha:onboarding-complete";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const redirected = useRef(false);

    // Check all expenses and income for the current year
    const now = new Date();
    const { data: expenses, isLoading: expensesLoading } = useExpenses(
        now.getFullYear(),
        null,
        null
    );
    const { data: income, isLoading: incomeLoading } = useIncome(null);

    useEffect(() => {
        // Skip if already on onboarding page or already redirected
        if (pathname === "/onboarding" || redirected.current) return;

        // Skip if still loading
        if (expensesLoading || incomeLoading) return;

        // Skip if onboarding already completed
        if (localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true") return;

        const hasExpenses = expenses && expenses.length > 0;
        const hasIncome = income && income.length > 0;

        if (!hasExpenses && !hasIncome) {
            // New user — redirect to onboarding
            redirected.current = true;
            router.replace("/onboarding");
        } else {
            // Existing user with data — mark onboarding as done
            localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
        }
    }, [pathname, expenses, income, expensesLoading, incomeLoading, router]);

    return <>{children}</>;
}
