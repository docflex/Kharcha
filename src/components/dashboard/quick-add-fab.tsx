"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Wallet, Upload } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function QuickAddFab() {
    const [open, setOpen] = useState(false);

    return (
        <div
            data-tour="quick-add-fab"
            className="fixed bottom-24 right-4 z-40 md:bottom-6 md:right-6"
        >
            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 -z-10"
                            onClick={() => setOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 8 }}
                            transition={{ duration: 0.12 }}
                            className="absolute bottom-14 right-0 mb-1 flex flex-col gap-1"
                        >
                            <Link
                                href="/expenses?add=true"
                                onClick={() => setOpen(false)}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-card border-2 border-border shadow-[2px_2px_0px_0px] shadow-border/50 hover:bg-muted transition-all"
                                title="Add Expense"
                            >
                                <Wallet className="h-4 w-4 text-primary" strokeWidth={2.5} />
                            </Link>
                            <Link
                                href="/upload"
                                onClick={() => setOpen(false)}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-card border-2 border-border shadow-[2px_2px_0px_0px] shadow-border/50 hover:bg-muted transition-all"
                                title="Upload"
                            >
                                <Upload className="h-4 w-4 text-primary" strokeWidth={2.5} />
                            </Link>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.6 }}
                onClick={() => setOpen(!open)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground border-2 border-foreground shadow-[2px_2px_0px_0px] shadow-foreground hover:shadow-[3px_3px_0px_0px] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
            >
                <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.12 }}>
                    <Plus className="h-5 w-5" strokeWidth={3} />
                </motion.div>
            </motion.button>
        </div>
    );
}
