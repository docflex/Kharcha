"use client";

import { motion } from "motion/react";

interface SpendingRingProps {
    spent: number;
    income: number;
    size?: number;
}

export function SpendingRing({ spent, income, size = 100 }: SpendingRingProps) {
    const ratio = income > 0 ? Math.min(spent / income, 1.5) : 0;
    const pct = Math.min(ratio * 100, 150);
    const strokeWidth = size * 0.1;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - Math.min(ratio, 1));

    // Color based on ratio
    const color =
        ratio > 1
            ? "stroke-destructive"
            : ratio > 0.8
              ? "stroke-amber-500"
              : ratio > 0.5
                ? "stroke-primary"
                : "stroke-green-500";

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg
                viewBox={`0 0 ${size} ${size}`}
                className="-rotate-90"
                style={{ width: size, height: size }}
            >
                {/* Background ring */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={strokeWidth}
                    className="stroke-muted"
                />
                {/* Progress ring */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    className={color}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: dashOffset }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black font-mono leading-none">
                    {income > 0 ? `${Math.round(pct)}%` : "—"}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                    spent
                </span>
            </div>
        </div>
    );
}
