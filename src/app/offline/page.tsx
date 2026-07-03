"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { motion } from "motion/react";

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function OfflinePage() {
    return (
        <div className="flex min-h-screen items-center justify-center p-6 bg-background">
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="text-center space-y-4"
            >
                <motion.div variants={item} className="flex justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-border bg-card shadow-[4px_4px_0px_0px] shadow-border/50">
                        <WifiOff className="h-8 w-8 text-muted-foreground" strokeWidth={2.5} />
                    </div>
                </motion.div>
                <motion.h1 variants={item} className="text-3xl font-black uppercase tracking-tight">
                    You&apos;re Offline
                </motion.h1>
                <motion.p
                    variants={item}
                    className="text-muted-foreground font-mono text-sm max-w-xs mx-auto"
                >
                    Check your connection and try again.
                </motion.p>
                <motion.div variants={item}>
                    <button
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center gap-2 rounded-lg border-2 border-border bg-card px-6 py-3 font-bold shadow-[3px_3px_0px_0px] shadow-border/50 hover:border-primary hover:text-primary active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
                    >
                        <RefreshCw className="h-4 w-4" strokeWidth={2.5} />
                        Retry
                    </button>
                </motion.div>
            </motion.div>
        </div>
    );
}
