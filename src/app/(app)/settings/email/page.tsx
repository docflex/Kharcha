"use client";

import { useState, useEffect, Fragment } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    Mail,
    CheckCircle,
    XCircle,
    Loader2,
    Send,
    Clock,
    ChevronDown,
    RefreshCw,
    BookOpen,
    ToggleLeft,
    ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useEmailStatus, useEmailLog, useSendTestEmail } from "@/hooks/use-email";

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function EmailSettingsPage() {
    const { data: status = null } = useEmailStatus();
    const { data: logs = [], isLoading: queryLoading } = useEmailLog();
    const sendTestEmail = useSendTestEmail();

    // Prevent hydration mismatch from persisted React Query cache
    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setMounted(true), []);
    const loading = !mounted || queryLoading;

    // EM5: Monthly reminder toggle (client-side state)
    const [remindersEnabled, setRemindersEnabled] = useState(true);
    // EM2: Expandable log rows
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    // EM6: Track which button is loading
    const [sendingType, setSendingType] = useState<string | null>(null);

    async function handleTestEmail(type: "upload_reminder" | "dashboard_ready") {
        setSendingType(type);
        const now = new Date();
        try {
            await sendTestEmail.mutateAsync({
                type,
                year: now.getFullYear(),
                month: now.getMonth() + 1,
            });
            toast.success(
                `Test ${type === "upload_reminder" ? "reminder" : "dashboard"} email sent!`
            );
        } catch {
            toast.error("Failed to send test email");
        } finally {
            setSendingType(null);
        }
    }

    // EM7: Retry for failed entries
    async function handleRetry(log: { type: string }) {
        const type = log.type as "upload_reminder" | "dashboard_ready";
        await handleTestEmail(type);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
            {/* Header */}
            <motion.div variants={item}>
                <h1 className="text-3xl font-black tracking-tight uppercase md:text-4xl">
                    Email Settings
                </h1>
                <p className="text-sm font-mono text-muted-foreground mt-1">
                    Configure email reminders and notifications
                </p>
            </motion.div>

            {/* Status Card */}
            <motion.div
                variants={item}
                className="rounded-lg border-2 border-border bg-card p-6 shadow-[3px_3px_0px_0px] shadow-border/50"
            >
                <h2 className="text-lg font-black uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Mail className="h-5 w-5" strokeWidth={2.5} />
                    SMTP Configuration
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* EM1: Neutral grey/blue for unconfigured state */}
                    <div className="flex items-center gap-3 rounded-md border-2 border-border p-4">
                        {status?.configured ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                            <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                Configured
                            </p>
                            <p className="text-sm font-bold">
                                {status?.configured ? (
                                    "Yes"
                                ) : (
                                    <span className="text-muted-foreground">
                                        Not yet configured
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-md border-2 border-border p-4">
                        {status?.connected ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                            <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                Connection
                            </p>
                            <p className="text-sm font-bold">
                                {status?.connected ? (
                                    "Connected"
                                ) : (
                                    <span className="text-muted-foreground">Not connected</span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* EM3: Link to deployment guide instead of raw env vars */}
                {!status?.configured && (
                    <div className="mt-4 rounded-md border-2 border-muted-foreground/20 bg-muted/30 p-4">
                        <div className="flex items-start gap-3">
                            <BookOpen className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold">Setup Required</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    SMTP credentials need to be configured as environment variables.
                                    See the{" "}
                                    <Link
                                        href="/DEPLOYMENT-GUIDE.md"
                                        target="_blank"
                                        className="font-bold underline underline-offset-4 hover:text-foreground transition-colors"
                                    >
                                        Deployment Guide
                                    </Link>{" "}
                                    for detailed instructions.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Test Emails + EM5 Toggle */}
            <motion.div
                variants={item}
                className="rounded-lg border-2 border-border bg-card p-6 shadow-[3px_3px_0px_0px] shadow-border/50"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-black uppercase tracking-wide flex items-center gap-2">
                        <Send className="h-5 w-5" strokeWidth={2.5} />
                        Send Test Email
                    </h2>

                    {/* EM5: Monthly reminder toggle */}
                    <button
                        onClick={() => {
                            setRemindersEnabled((v) => !v);
                            toast.success(
                                remindersEnabled
                                    ? "Monthly reminders disabled"
                                    : "Monthly reminders enabled"
                            );
                        }}
                        className="flex items-center gap-2 text-sm font-bold"
                        aria-label="Toggle monthly reminders"
                    >
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                            Monthly Reminders
                        </span>
                        {remindersEnabled ? (
                            <ToggleRight className="h-6 w-6 text-primary" />
                        ) : (
                            <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                        )}
                    </button>
                </div>

                {/* EM6: Per-button loading spinner + toast feedback */}
                <div className="flex flex-wrap gap-3">
                    <Button
                        onClick={() => handleTestEmail("upload_reminder")}
                        disabled={sendingType !== null || !status?.configured}
                        variant="outline"
                        className="font-bold gap-1.5"
                    >
                        {sendingType === "upload_reminder" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Clock className="h-4 w-4" strokeWidth={2.5} />
                        )}
                        Send Reminder
                    </Button>
                    <Button
                        onClick={() => handleTestEmail("dashboard_ready")}
                        disabled={sendingType !== null || !status?.configured}
                        variant="outline"
                        className="font-bold gap-1.5"
                    >
                        {sendingType === "dashboard_ready" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <CheckCircle className="h-4 w-4" strokeWidth={2.5} />
                        )}
                        Send Dashboard Ready
                    </Button>
                </div>

                <p className="text-xs text-muted-foreground mt-3">
                    Automatic reminders run on the 1st of each month at 9:00 AM IST.
                </p>
            </motion.div>

            {/* Email Log */}
            <motion.div
                variants={item}
                className="rounded-lg border-2 border-border bg-card p-6 shadow-[3px_3px_0px_0px] shadow-border/50"
            >
                <h2 className="text-lg font-black uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Mail className="h-5 w-5" strokeWidth={2.5} />
                    Email Log
                </h2>

                {logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No emails sent yet.</p>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b-2">
                                        <TableHead className="font-black uppercase text-xs tracking-widest">
                                            Type
                                        </TableHead>
                                        <TableHead className="font-black uppercase text-xs tracking-widest">
                                            Subject
                                        </TableHead>
                                        <TableHead className="font-black uppercase text-xs tracking-widest">
                                            Sent At
                                        </TableHead>
                                        <TableHead className="font-black uppercase text-xs tracking-widest">
                                            Status
                                        </TableHead>
                                        <TableHead className="font-black uppercase text-xs tracking-widest w-[80px]" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <Fragment key={log.id}>
                                            <TableRow
                                                className="hover:bg-muted/30 transition-colors cursor-pointer"
                                                onClick={() =>
                                                    setExpandedLogId(
                                                        expandedLogId === log.id ? null : log.id
                                                    )
                                                }
                                            >
                                                <TableCell className="font-mono text-xs">
                                                    {log.type === "upload_reminder"
                                                        ? "📊 Reminder"
                                                        : "✅ Dashboard"}
                                                </TableCell>
                                                <TableCell className="text-sm max-w-[200px] truncate">
                                                    {log.subject || "—"}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {log.sentAt
                                                        ? new Date(log.sentAt).toLocaleString()
                                                        : "—"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            log.status === "sent"
                                                                ? "default"
                                                                : "destructive"
                                                        }
                                                    >
                                                        {log.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        {/* EM2: Expand toggle */}
                                                        <button
                                                            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                                                            aria-label="Expand details"
                                                        >
                                                            <ChevronDown
                                                                className={`h-4 w-4 transition-transform ${
                                                                    expandedLogId === log.id
                                                                        ? "rotate-180"
                                                                        : ""
                                                                }`}
                                                            />
                                                        </button>
                                                        {/* EM7: Retry for failed */}
                                                        {log.status === "failed" && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRetry(log);
                                                                }}
                                                                aria-label="Retry send"
                                                                className="h-8 w-8"
                                                            >
                                                                <RefreshCw className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            {/* EM2: Expanded row details */}
                                            {expandedLogId === log.id && (
                                                <TableRow key={`${log.id}-detail`}>
                                                    <TableCell
                                                        colSpan={5}
                                                        className="bg-muted/20 py-3"
                                                    >
                                                        <div className="text-xs font-mono space-y-1">
                                                            <p>
                                                                <span className="font-bold">
                                                                    Type:{" "}
                                                                </span>
                                                                {log.type}
                                                            </p>
                                                            <p>
                                                                <span className="font-bold">
                                                                    Subject:{" "}
                                                                </span>
                                                                {log.subject || "—"}
                                                            </p>
                                                            <p>
                                                                <span className="font-bold">
                                                                    Status:{" "}
                                                                </span>
                                                                <span
                                                                    className={
                                                                        log.status === "failed"
                                                                            ? "text-destructive"
                                                                            : "text-green-600 dark:text-green-400"
                                                                    }
                                                                >
                                                                    {log.status}
                                                                </span>
                                                            </p>
                                                            <p>
                                                                <span className="font-bold">
                                                                    Timestamp:{" "}
                                                                </span>
                                                                {log.sentAt
                                                                    ? new Date(
                                                                          log.sentAt
                                                                      ).toISOString()
                                                                    : "—"}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile Card Layout */}
                        <div className="md:hidden space-y-3">
                            <AnimatePresence mode="popLayout">
                                {logs.map((log) => (
                                    <motion.div
                                        key={log.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-lg border-2 border-border bg-card p-4 shadow-[3px_3px_0px_0px] shadow-border/50"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold">
                                                    {log.type === "upload_reminder"
                                                        ? "📊 Reminder"
                                                        : "✅ Dashboard"}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                    {log.subject || "—"}
                                                </p>
                                            </div>
                                            <Badge
                                                variant={
                                                    log.status === "sent"
                                                        ? "default"
                                                        : "destructive"
                                                }
                                            >
                                                {log.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <p className="text-xs font-mono text-muted-foreground">
                                                {log.sentAt
                                                    ? new Date(log.sentAt).toLocaleString()
                                                    : "—"}
                                            </p>
                                            {/* EM7: Retry for failed */}
                                            {log.status === "failed" && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRetry(log)}
                                                    aria-label="Retry send"
                                                    className="h-10 w-10"
                                                >
                                                    <RefreshCw className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </>
                )}
            </motion.div>
        </motion.div>
    );
}
