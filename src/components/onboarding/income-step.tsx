"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { IndianRupee, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateIncome } from "@/hooks/use-income";
import { useCurrency } from "@/contexts/currency-context";
import { formatInputWithCommas, stripCommas } from "@/lib/utils/currency";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { toast } from "sonner";

interface IncomeStepProps {
    onIncomeSaved: () => void;
}

export function IncomeStep({ onIncomeSaved }: IncomeStepProps) {
    const [amount, setAmount] = useState("");
    const createIncome = useCreateIncome();
    const { currency } = useCurrency();
    const currencySymbol = SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.symbol ?? "₹";

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    async function handleSave() {
        const parsedAmount = parseFloat(stripCommas(amount));
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            toast.error("Please enter a valid income amount");
            return;
        }

        try {
            await createIncome.mutateAsync({
                year: currentYear,
                month: currentMonth,
                amount: parsedAmount,
                source: "manual",
            });
            toast.success("Income saved!");
            onIncomeSaved();
        } catch (_err) {
            toast.error("Failed to save income. You can set it later in Settings.");
            onIncomeSaved();
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center justify-center text-center space-y-6 py-8"
        >
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-green-500/10 border-2 border-green-500/30">
                <IndianRupee className="h-8 w-8 text-green-500" strokeWidth={2.5} />
            </div>

            <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight uppercase md:text-3xl">
                    Monthly Take-Home
                </h2>
                <p className="text-sm text-muted-foreground max-w-md">
                    What&apos;s your monthly in-hand salary? This helps calculate savings rate.
                </p>
            </div>

            <div className="w-full max-w-xs space-y-3">
                <Label className="text-xs font-bold uppercase tracking-widest text-left block">
                    Monthly Income
                </Label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">
                        {currencySymbol}
                    </span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        placeholder={currency === "INR" ? "13,00,000" : "1,300,000"}
                        value={amount}
                        onChange={(e) => setAmount(formatInputWithCommas(e.target.value, currency))}
                        className="pl-8 text-lg font-mono font-bold h-12 border-2"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSave();
                        }}
                    />
                </div>
                <button
                    onClick={handleSave}
                    disabled={createIncome.isPending || !amount.trim()}
                    className="w-full rounded-md border-2 border-foreground bg-primary text-primary-foreground px-4 py-2.5 text-sm font-black uppercase tracking-wider shadow-[3px_3px_0px_0px] shadow-foreground hover:shadow-[4px_4px_0px_0px] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {createIncome.isPending ? (
                        <span className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                        </span>
                    ) : (
                        "Save Income"
                    )}
                </button>
            </div>
        </motion.div>
    );
}
