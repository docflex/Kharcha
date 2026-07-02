"use client";

import { getPasswordStrength } from "@/lib/utils/password-strength";

const colorMap = {
    weak: "bg-destructive",
    fair: "bg-amber-500",
    good: "bg-blue-500",
    strong: "bg-green-500",
};

const textColorMap = {
    weak: "text-destructive",
    fair: "text-amber-500",
    good: "text-blue-500",
    strong: "text-green-500",
};

interface PasswordStrengthIndicatorProps {
    password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
    if (!password) return null;

    const { score, label, feedback } = getPasswordStrength(password);

    return (
        <div className="space-y-1.5">
            {/* Strength bar */}
            <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full border border-border/50 transition-colors ${
                            i <= score ? colorMap[label] : "bg-muted"
                        }`}
                    />
                ))}
            </div>

            {/* Label */}
            <div className="flex items-center justify-between">
                <span
                    className={`text-[10px] font-bold uppercase tracking-widest ${textColorMap[label]}`}
                >
                    {label}
                </span>
            </div>

            {/* Feedback */}
            {feedback.length > 0 && (
                <ul className="space-y-0.5">
                    {feedback.map((f) => (
                        <li key={f} className="text-[10px] font-mono text-muted-foreground">
                            {f}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
