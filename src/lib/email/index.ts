export {
    sendEmail,
    verifyConnection,
    isEmailConfigured,
    getEmailConfig,
    resetTransport,
} from "./client";
export {
    sendUploadReminder,
    sendDashboardReady,
    getEmailLog,
    type SendReminderInput,
    type SendDashboardReadyInput,
    type EmailResult,
} from "./service";
export { renderUploadReminder, renderDashboardReady } from "./templates";
export {
    startScheduler,
    stopScheduler,
    isSchedulerRunning,
    REMINDER_CRON_EXPRESSION,
} from "./scheduler";
