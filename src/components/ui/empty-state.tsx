"use client";

import { type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface EmptyStateAction {
    label: string;
    href?: string;
    onClick?: () => void;
    variant?: "default" | "outline";
}

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actions?: EmptyStateAction[];
    className?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    actions,
    className,
}: EmptyStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`rounded-lg border-2 border-border p-8 text-center shadow-[3px_3px_0px_0px] shadow-border/50 ${className ?? ""}`}
        >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-muted border-2 border-border mb-4">
                <Icon className="h-6 w-6 text-muted-foreground" strokeWidth={2} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground font-mono max-w-md mx-auto leading-relaxed">
                {description}
            </p>
            {actions && actions.length > 0 && (
                <div className="flex items-center justify-center gap-3 mt-5">
                    {actions.map((action) =>
                        action.href ? (
                            <Link
                                key={action.label}
                                href={action.href}
                                className={cn(
                                    buttonVariants({ variant: action.variant ?? "default" }),
                                    "font-bold"
                                )}
                            >
                                {action.label}
                            </Link>
                        ) : (
                            <Button
                                key={action.label}
                                variant={action.variant ?? "default"}
                                className="font-bold"
                                onClick={action.onClick}
                            >
                                {action.label}
                            </Button>
                        )
                    )}
                </div>
            )}
        </motion.div>
    );
}
