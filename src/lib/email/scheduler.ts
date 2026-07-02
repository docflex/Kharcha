import cron from "node-cron";
import type { ScheduledTask } from "node-cron";

/**
 * Cron expression: 1st of every month at 9:00 AM IST (3:30 AM UTC).
 * Format: minute hour day-of-month month day-of-week
 */
export const REMINDER_CRON_EXPRESSION = "30 3 1 * *";

let scheduledTask: ScheduledTask | null = null;

/**
 * Start the monthly upload reminder scheduler.
 * The callback is invoked on the 1st of every month at 9:00 AM IST.
 *
 * On Vercel, this is a no-op — Vercel Cron handles scheduling
 * via the /api/cron/email-reminder endpoint instead.
 */
export function startScheduler(callback?: () => void | Promise<void>): void {
    if (scheduledTask) return;

    if (process.env.VERCEL) {
        console.log(
            "[Kharcha Scheduler] Running on Vercel — skipping node-cron (using Vercel Cron)"
        );
        return;
    }

    const defaultCallback = async () => {
        console.log("[Kharcha Scheduler] Monthly reminder triggered at", new Date().toISOString());
        if (callback) await callback();
    };

    scheduledTask = cron.schedule(REMINDER_CRON_EXPRESSION, callback || defaultCallback, {
        timezone: "Asia/Kolkata",
    });
}

/**
 * Stop the scheduler.
 */
export function stopScheduler(): void {
    if (scheduledTask) {
        scheduledTask.stop();
        scheduledTask = null;
    }
}

/**
 * Check if the scheduler is currently running.
 */
export function isSchedulerRunning(): boolean {
    return scheduledTask !== null;
}
