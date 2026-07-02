// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock node-cron
vi.mock("node-cron", () => ({
    default: {
        schedule: vi.fn().mockReturnValue({
            start: vi.fn(),
            stop: vi.fn(),
        }),
        validate: vi.fn().mockReturnValue(true),
    },
}));

import cron from "node-cron";
import {
    startScheduler,
    stopScheduler,
    isSchedulerRunning,
    REMINDER_CRON_EXPRESSION,
} from "@/lib/email/scheduler";

describe("Email Scheduler", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        stopScheduler();
    });

    afterEach(() => {
        stopScheduler();
    });

    describe("REMINDER_CRON_EXPRESSION", () => {
        it("is set to 1st of every month at 9:00 AM IST", () => {
            // 9:00 AM IST = 3:30 AM UTC
            expect(REMINDER_CRON_EXPRESSION).toBe("30 3 1 * *");
        });

        it("is a valid cron expression", () => {
            expect(cron.validate(REMINDER_CRON_EXPRESSION)).toBe(true);
        });
    });

    describe("startScheduler", () => {
        it("starts the cron job", () => {
            startScheduler();

            expect(cron.schedule).toHaveBeenCalledWith(
                REMINDER_CRON_EXPRESSION,
                expect.any(Function),
                expect.objectContaining({ timezone: "Asia/Kolkata" })
            );
        });

        it("sets scheduler as running", () => {
            expect(isSchedulerRunning()).toBe(false);
            startScheduler();
            expect(isSchedulerRunning()).toBe(true);
        });

        it("does not start multiple times", () => {
            startScheduler();
            startScheduler();

            expect(cron.schedule).toHaveBeenCalledTimes(1);
        });
    });

    describe("stopScheduler", () => {
        it("stops the scheduler", () => {
            startScheduler();
            expect(isSchedulerRunning()).toBe(true);

            stopScheduler();
            expect(isSchedulerRunning()).toBe(false);
        });

        it("is safe to call when not running", () => {
            expect(() => stopScheduler()).not.toThrow();
        });
    });
});
