"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { PartyPopper } from "lucide-react";
import confetti from "canvas-confetti";

const BRAND_COLORS = ["#F59E0B", "#EF4444", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899"];

function fireConfetti() {
    const defaults = {
        colors: BRAND_COLORS,
        zIndex: 9999,
    };

    // Big burst from left
    confetti({
        ...defaults,
        particleCount: 80,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.6 },
        startVelocity: 55,
    });

    // Big burst from right
    confetti({
        ...defaults,
        particleCount: 80,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.6 },
        startVelocity: 55,
    });

    // Delayed center rain
    setTimeout(() => {
        confetti({
            ...defaults,
            particleCount: 50,
            angle: 90,
            spread: 120,
            origin: { x: 0.5, y: 0.3 },
            startVelocity: 35,
            gravity: 0.8,
        });
    }, 400);

    // Final sparkle burst
    setTimeout(() => {
        confetti({
            ...defaults,
            particleCount: 40,
            angle: 60,
            spread: 55,
            origin: { x: 0.15, y: 0.5 },
            startVelocity: 45,
        });
        confetti({
            ...defaults,
            particleCount: 40,
            angle: 120,
            spread: 55,
            origin: { x: 0.85, y: 0.5 },
            startVelocity: 45,
        });
    }, 900);
}

export function CompleteStep() {
    useEffect(() => {
        // Delay so confetti fires after the slide-in animation (300ms)
        const timer = setTimeout(() => fireConfetti(), 400);
        return () => clearTimeout(timer);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative flex flex-col items-center justify-center text-center space-y-6 py-8"
        >
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.2 }}
                className="flex h-20 w-20 items-center justify-center rounded-2xl bg-green-500/10 border-2 border-green-500/30"
            >
                <PartyPopper className="h-10 w-10 text-green-500" strokeWidth={2} />
            </motion.div>

            <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight uppercase md:text-4xl">
                    You&apos;re All Set! 🎉
                </h2>
                <p className="text-lg text-muted-foreground max-w-md">
                    Your dashboard is ready. Start tracking your expenses and watch your financial
                    health improve.
                </p>
            </div>
        </motion.div>
    );
}
