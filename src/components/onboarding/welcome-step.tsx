"use client";

import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

interface WelcomeStepProps {
    userName: string | null;
}

export function WelcomeStep({ userName }: WelcomeStepProps) {
    const firstName = userName?.split(" ")[0] ?? "there";

    return (
        <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center justify-center text-center space-y-6 py-8"
        >
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.2 }}
                className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground border-2 border-foreground shadow-[4px_4px_0px_0px] shadow-foreground"
            >
                <span className="text-4xl font-black">₹</span>
            </motion.div>

            <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight uppercase md:text-4xl">
                    Welcome to Kharcha!
                </h2>
                <p className="text-lg text-muted-foreground">
                    Hey {firstName}, let&apos;s set things up in under a minute.
                </p>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-2 rounded-lg border-2 border-border bg-card px-4 py-3 text-sm"
            >
                <Sparkles className="h-4 w-4 text-primary shrink-0" strokeWidth={2.5} />
                <span className="text-muted-foreground">
                    We&apos;ll help you set income, import data, and configure budgets.
                </span>
            </motion.div>
        </motion.div>
    );
}
