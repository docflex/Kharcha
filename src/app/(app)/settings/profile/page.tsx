"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
    User,
    Save,
    Lock,
    CheckCircle,
    AlertCircle,
    Shield,
    Trash2,
    AlertTriangle,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { LoadingSkeleton } from "@/components/layout/loading-skeleton";
import { useProfile, useUpdateProfile, useChangePassword } from "@/hooks/use-profile";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength";
import { isPasswordComplex } from "@/lib/utils/password-strength";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "JPY", "CAD", "AUD"];

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function ProfilePage() {
    const { data: profile = null, isLoading: loading } = useProfile();
    const updateProfile = useUpdateProfile();
    const changePassword = useChangePassword();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Profile form
    const [name, setName] = useState("");
    const [currency, setCurrency] = useState("INR");
    const [monthlyIncome, setMonthlyIncome] = useState("");
    const [formInitialized, setFormInitialized] = useState(false);

    // Password form
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

    // Populate form fields when profile loads
    useEffect(() => {
        if (profile && !formInitialized) {
            setName(profile.name || ""); // eslint-disable-line react-hooks/set-state-in-effect
            setCurrency(profile.preferredCurrency || "INR");
            setMonthlyIncome(
                profile.defaultMonthlyIncome ? String(profile.defaultMonthlyIncome) : ""
            );
            setFormInitialized(true);
        }
    }, [profile, formInitialized]);

    const { confirm, dialog: confirmDialog } = useConfirmDialog();

    function handleSaveProfile(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        const body: Record<string, unknown> = {};
        if (name.trim()) body.name = name.trim();
        if (currency) body.preferredCurrency = currency;
        if (monthlyIncome) body.defaultMonthlyIncome = Number(monthlyIncome);

        confirm({
            title: "Update Profile",
            description: "Save changes to your profile?",
            confirmLabel: "Save",
            variant: "default",
            onConfirm: async () => {
                try {
                    await updateProfile.mutateAsync(
                        body as {
                            name?: string;
                            preferredCurrency?: string;
                            defaultMonthlyIncome?: number;
                        }
                    );
                    toast.success("Profile updated");
                } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to update profile");
                }
            },
        });
    }

    function handleChangePassword(e: React.FormEvent) {
        e.preventDefault();
        setPasswordError(null);
        setPasswordSuccess(null);

        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords do not match");
            return;
        }

        const complexity = isPasswordComplex(newPassword);
        if (!complexity.valid) {
            setPasswordError(complexity.errors.join(". "));
            return;
        }

        confirm({
            title: "Change Password",
            description: "Are you sure you want to change your password?",
            confirmLabel: "Change Password",
            variant: "default",
            onConfirm: async () => {
                try {
                    await changePassword.mutateAsync({ currentPassword, newPassword });
                    toast.success("Password changed");
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                } catch (err) {
                    const msg = err instanceof Error ? err.message : "Failed to change password";
                    setPasswordError(msg);
                }
            },
        });
    }

    if (loading) {
        return (
            <div className="mx-auto max-w-2xl space-y-6">
                <LoadingSkeleton />
            </div>
        );
    }

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="mx-auto max-w-2xl space-y-6"
        >
            {/* Page Header */}
            <motion.div variants={item} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground border-2 border-foreground shadow-[2px_2px_0px_0px] shadow-foreground">
                    <User className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <div>
                    <h1 className="text-xl font-black uppercase tracking-tight">Profile</h1>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                        Manage your account
                    </p>
                </div>
            </motion.div>

            {/* Profile Form */}
            <motion.div
                variants={item}
                className="rounded-lg border-2 border-border bg-card p-6 shadow-[3px_3px_0px_0px] shadow-border/50"
            >
                <h2 className="text-sm font-black uppercase tracking-widest mb-4">
                    Account Details
                </h2>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2 rounded-md border-2 border-destructive bg-destructive/10 p-3 text-sm font-bold text-destructive"
                        >
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </motion.div>
                    )}
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2 rounded-md border-2 border-green-500 bg-green-500/10 p-3 text-sm font-bold text-green-700 dark:text-green-400"
                        >
                            <CheckCircle className="h-4 w-4 shrink-0" />
                            {success}
                        </motion.div>
                    )}

                    {/* Email (read-only) */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-widest">Email</Label>
                        <Input
                            value={profile?.email || ""}
                            disabled
                            className="border-2 border-border bg-muted font-mono text-sm h-10 opacity-60"
                        />
                        <p className="text-[10px] font-mono text-muted-foreground">
                            Email cannot be changed
                        </p>
                    </div>

                    {/* Name */}
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="name"
                            className="text-xs font-bold uppercase tracking-widest"
                        >
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="border-2 border-border bg-background font-mono text-sm h-10 focus:border-primary focus:ring-primary"
                            required
                        />
                    </div>

                    {/* Currency */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-widest">
                            Preferred Currency
                        </Label>
                        <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
                            <SelectTrigger className="border-2 border-border bg-background h-10 font-mono text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-2 border-border">
                                {CURRENCIES.map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {c}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Default Monthly Income */}
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="income"
                            className="text-xs font-bold uppercase tracking-widest"
                        >
                            Default Monthly Income
                        </Label>
                        <Input
                            id="income"
                            type="number"
                            step="0.01"
                            min="0"
                            value={monthlyIncome}
                            onChange={(e) => setMonthlyIncome(e.target.value)}
                            placeholder="e.g. 150000"
                            className="border-2 border-border bg-background font-mono text-sm h-10 focus:border-primary focus:ring-primary"
                        />
                    </div>

                    {/* Member Since */}
                    {profile?.createdAt && (
                        <div className="pt-2 border-t border-border">
                            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                                Member since{" "}
                                {new Date(profile.createdAt).toLocaleDateString("en-IN", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </p>
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={updateProfile.isPending}
                        className="w-full h-10 border-2 border-foreground shadow-[3px_3px_0px_0px] shadow-foreground font-black uppercase tracking-wider text-xs hover:shadow-[4px_4px_0px_0px] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-[1px_1px_0px_0px] active:translate-x-[1px] active:translate-y-[1px] transition-all"
                    >
                        {updateProfile.isPending ? (
                            <span className="flex items-center gap-2">
                                <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{
                                        duration: 1,
                                        repeat: Infinity,
                                        ease: "linear",
                                    }}
                                    className="inline-block h-3.5 w-3.5 border-2 border-primary-foreground border-t-transparent rounded-full"
                                />
                                Saving...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <Save className="h-3.5 w-3.5" />
                                Save Changes
                            </span>
                        )}
                    </Button>
                </form>
            </motion.div>

            {/* Change Password / OAuth Badge */}
            {profile?.hasPassword === false ? (
                <motion.div
                    variants={item}
                    className="rounded-lg border-2 border-border bg-card p-6 shadow-[3px_3px_0px_0px] shadow-border/50"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Shield className="h-4 w-4 text-blue-500" strokeWidth={2.5} />
                        <h2 className="text-sm font-black uppercase tracking-widest">
                            Authentication
                        </h2>
                    </div>
                    <div className="flex items-center gap-3 rounded-md border-2 border-blue-500/30 bg-blue-500/10 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-500/20 border-2 border-blue-500/30">
                            <Shield className="h-5 w-5 text-blue-500" strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-sm font-bold">Signed in via Google</p>
                            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                                Password management is handled by your Google account
                            </p>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    variants={item}
                    className="rounded-lg border-2 border-border bg-card p-6 shadow-[3px_3px_0px_0px] shadow-border/50"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Lock className="h-4 w-4" strokeWidth={2.5} />
                        <h2 className="text-sm font-black uppercase tracking-widest">
                            Change Password
                        </h2>
                    </div>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        {passwordError && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2 rounded-md border-2 border-destructive bg-destructive/10 p-3 text-sm font-bold text-destructive"
                            >
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                {passwordError}
                            </motion.div>
                        )}
                        {passwordSuccess && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2 rounded-md border-2 border-green-500 bg-green-500/10 p-3 text-sm font-bold text-green-700 dark:text-green-400"
                            >
                                <CheckCircle className="h-4 w-4 shrink-0" />
                                {passwordSuccess}
                            </motion.div>
                        )}

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="current-password"
                                className="text-xs font-bold uppercase tracking-widest"
                            >
                                Current Password
                            </Label>
                            <Input
                                id="current-password"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                className="border-2 border-border bg-background font-mono text-sm h-10 focus:border-primary focus:ring-primary"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="new-password"
                                className="text-xs font-bold uppercase tracking-widest"
                            >
                                New Password
                            </Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={8}
                                placeholder="Min 8 characters"
                                className="border-2 border-border bg-background font-mono text-sm h-10 focus:border-primary focus:ring-primary"
                            />
                            <PasswordStrengthIndicator password={newPassword} />
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="confirm-password"
                                className="text-xs font-bold uppercase tracking-widest"
                            >
                                Confirm New Password
                            </Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={8}
                                className="border-2 border-border bg-background font-mono text-sm h-10 focus:border-primary focus:ring-primary"
                            />
                        </div>

                        <Button
                            type="submit"
                            variant="outline"
                            disabled={changePassword.isPending}
                            className="w-full h-10 border-2 border-border font-black uppercase tracking-wider text-xs hover:bg-muted transition-colors"
                        >
                            {changePassword.isPending ? (
                                <span className="flex items-center gap-2">
                                    <motion.span
                                        animate={{ rotate: 360 }}
                                        transition={{
                                            duration: 1,
                                            repeat: Infinity,
                                            ease: "linear",
                                        }}
                                        className="inline-block h-3.5 w-3.5 border-2 border-foreground border-t-transparent rounded-full"
                                    />
                                    Changing...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Lock className="h-3.5 w-3.5" />
                                    Change Password
                                </span>
                            )}
                        </Button>
                    </form>
                </motion.div>
            )}
            {confirmDialog}

            {/* Danger Zone */}
            <DangerZone />
        </motion.div>
    );
}

function DangerZone() {
    const [deleteDataConfirm, setDeleteDataConfirm] = useState("");
    const [deleteAccountConfirm, setDeleteAccountConfirm] = useState("");
    const [deletingData, setDeletingData] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);

    async function handleDeleteData() {
        if (deleteDataConfirm !== "DELETE") return;
        setDeletingData(true);
        try {
            await apiClient.delete("/api/user/data");
            toast.success("All data deleted");
            setDeleteDataConfirm("");
            window.location.reload();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete data");
        } finally {
            setDeletingData(false);
        }
    }

    async function handleDeleteAccount() {
        if (deleteAccountConfirm !== "DELETE") return;
        setDeletingAccount(true);
        try {
            await apiClient.delete("/api/user/account");
            toast.success("Account deleted");
            await signOut({ callbackUrl: "/auth/login" });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete account");
            setDeletingAccount(false);
        }
    }

    return (
        <motion.div
            variants={item}
            className="rounded-lg border-2 border-destructive/50 bg-card p-6 shadow-[3px_3px_0px_0px] shadow-destructive/20"
        >
            <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 text-destructive" strokeWidth={2.5} />
                <h2 className="text-sm font-black uppercase tracking-widest text-destructive">
                    Danger Zone
                </h2>
            </div>

            {/* Delete All Data */}
            <div className="space-y-3 rounded-md border-2 border-border p-4">
                <div>
                    <p className="text-sm font-bold">Delete All Data</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Permanently delete all expenses, budgets, income, uploads, and personas.
                        Your account will be kept.
                    </p>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Type DELETE to confirm
                    </Label>
                    <Input
                        value={deleteDataConfirm}
                        onChange={(e) => setDeleteDataConfirm(e.target.value)}
                        placeholder="DELETE"
                        className="border-2 border-border bg-background font-mono text-sm h-9 max-w-[200px]"
                    />
                </div>
                <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleteDataConfirm !== "DELETE" || deletingData}
                    onClick={handleDeleteData}
                    className="border-2 border-destructive/50 shadow-[2px_2px_0px_0px] shadow-destructive/30 active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all font-bold text-xs uppercase tracking-wider"
                >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    {deletingData ? "Deleting..." : "Delete All Data"}
                </Button>
            </div>

            {/* Delete Account */}
            <div className="space-y-3 rounded-md border-2 border-destructive/30 bg-destructive/5 p-4 mt-4">
                <div>
                    <p className="text-sm font-bold text-destructive">Delete Account</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Permanently delete your account and all associated data. This action cannot
                        be undone.
                    </p>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Type DELETE to confirm
                    </Label>
                    <Input
                        value={deleteAccountConfirm}
                        onChange={(e) => setDeleteAccountConfirm(e.target.value)}
                        placeholder="DELETE"
                        className="border-2 border-border bg-background font-mono text-sm h-9 max-w-[200px]"
                    />
                </div>
                <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleteAccountConfirm !== "DELETE" || deletingAccount}
                    onClick={handleDeleteAccount}
                    className="border-2 border-destructive/50 shadow-[2px_2px_0px_0px] shadow-destructive/30 active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all font-bold text-xs uppercase tracking-wider"
                >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    {deletingAccount ? "Deleting..." : "Delete Account Forever"}
                </Button>
            </div>
        </motion.div>
    );
}
