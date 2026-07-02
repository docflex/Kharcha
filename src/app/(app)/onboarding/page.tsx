"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WelcomeStep } from "@/components/onboarding/welcome-step";
import { IncomeStep } from "@/components/onboarding/income-step";
import { ImportStep } from "@/components/onboarding/import-step";
import { BudgetStep } from "@/components/onboarding/budget-step";
import { CompleteStep } from "@/components/onboarding/complete-step";
import { useProfile } from "@/hooks/use-profile";
import { resetAllTours } from "@/lib/tour";

const ONBOARDING_COMPLETE_KEY = "kharcha:onboarding-complete";

const STEPS = ["welcome", "income", "import", "budget", "complete"] as const;
type StepName = (typeof STEPS)[number];

export default function OnboardingPage() {
    const router = useRouter();
    const { data: profile } = useProfile();
    const [currentStep, setCurrentStep] = useState(0);
    const [incomeSaved, setIncomeSaved] = useState(false);

    const stepName: StepName = STEPS[currentStep];

    function goNext() {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep((s) => s + 1);
        }
    }

    function goBack() {
        if (currentStep > 0) {
            setCurrentStep((s) => s - 1);
        }
    }

    function handleComplete() {
        localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
        // Reset all per-page tours so each page shows its mini-tour on first visit
        resetAllTours();
        router.push("/dashboard");
    }

    // Mark onboarding complete when user reaches the last step and clicks the dashboard link
    useEffect(() => {
        if (stepName === "complete") {
            localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
        }
    }, [stepName]);

    return (
        <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4">
            {/* Progress indicator */}
            <div className="mb-8 flex items-center gap-2">
                {STEPS.map((step, i) => (
                    <div
                        key={step}
                        className={`h-2 rounded-full transition-all duration-300 ${
                            i === currentStep
                                ? "w-8 bg-primary"
                                : i < currentStep
                                  ? "w-2 bg-primary/60"
                                  : "w-2 bg-muted-foreground/20"
                        }`}
                    />
                ))}
            </div>

            {/* Step content */}
            <div className="w-full max-w-lg">
                <AnimatePresence mode="wait">
                    {stepName === "welcome" && (
                        <WelcomeStep key="welcome" userName={profile?.name ?? null} />
                    )}
                    {stepName === "income" && (
                        <IncomeStep
                            key="income"
                            onIncomeSaved={() => {
                                setIncomeSaved(true);
                                goNext();
                            }}
                        />
                    )}
                    {stepName === "import" && (
                        <ImportStep key="import" onImported={goNext} onSkip={goNext} />
                    )}
                    {stepName === "budget" && (
                        <BudgetStep key="budget" onComplete={goNext} onSkip={goNext} />
                    )}
                    {stepName === "complete" && <CompleteStep key="complete" />}
                </AnimatePresence>
            </div>

            {/* Navigation buttons */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 flex items-center gap-4"
            >
                {currentStep > 0 && stepName !== "complete" && (
                    <button
                        onClick={goBack}
                        className="flex items-center gap-1.5 rounded-md border-2 border-border bg-card px-4 py-2 text-sm font-bold hover:bg-muted transition-colors shadow-[2px_2px_0px_0px] shadow-border/50 active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                    >
                        <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
                        Back
                    </button>
                )}

                {stepName === "welcome" && (
                    <button
                        onClick={goNext}
                        className="flex items-center gap-1.5 rounded-md border-2 border-foreground bg-primary text-primary-foreground px-6 py-2 text-sm font-black uppercase tracking-wider shadow-[3px_3px_0px_0px] shadow-foreground hover:shadow-[4px_4px_0px_0px] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
                    >
                        Let&apos;s Go
                        <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                )}

                {stepName === "income" && !incomeSaved && (
                    <button
                        onClick={goNext}
                        className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Skip for now
                        <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                )}

                {stepName === "complete" && (
                    <button
                        onClick={handleComplete}
                        className="flex items-center gap-1.5 rounded-md border-2 border-foreground bg-primary text-primary-foreground px-6 py-2 text-sm font-black uppercase tracking-wider shadow-[3px_3px_0px_0px] shadow-foreground hover:shadow-[4px_4px_0px_0px] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
                    >
                        Start Exploring
                        <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                )}
            </motion.div>

            {/* Step counter */}
            <p className="mt-4 text-xs font-mono text-muted-foreground">
                Step {currentStep + 1} of {STEPS.length}
            </p>
        </div>
    );
}
