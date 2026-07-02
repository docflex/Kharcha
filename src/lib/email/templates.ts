import { formatINR } from "@/lib/utils/currency";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CategorySummary {
    name: string;
    amount: number;
}

export interface UploadReminderData {
    userName: string;
    targetMonth: string;
    targetYear: number;
    appUrl: string;
    previousMonthStats?: {
        totalSpend: number;
        topCategories: CategorySummary[];
        savingsRate: number;
    };
}

export interface DashboardReadyData {
    userName: string;
    month: string;
    year: number;
    appUrl: string;
    totalSpend: number;
    topCategories: CategorySummary[];
    savingsRate: number;
    personaName?: string;
    personaEmoji?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Format INR, stripping trailing .00 for whole numbers */
function fmtINR(amount: number): string {
    const formatted = formatINR(amount);
    return formatted.replace(/\.00$/, "");
}

function wrapLayout(title: string, body: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; color: #0a0a0a; }
.container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 2px solid #0a0a0a; }
.header { background: #F59E0B; padding: 24px 32px; border-bottom: 2px solid #0a0a0a; }
.header h1 { margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #0a0a0a; }
.body { padding: 32px; }
.body h2 { font-size: 20px; font-weight: 800; margin: 0 0 16px 0; }
.body p { font-size: 15px; line-height: 1.6; margin: 0 0 16px 0; color: #333; }
.stat-card { background: #FFFBF5; border: 2px solid #0a0a0a; padding: 16px; margin: 8px 0; box-shadow: 3px 3px 0px 0px #0a0a0a; }
.stat-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #666; margin: 0 0 4px 0; }
.stat-value { font-size: 22px; font-weight: 900; font-family: 'Courier New', monospace; margin: 0; color: #0a0a0a; }
.btn { display: inline-block; background: #F59E0B; color: #0a0a0a; padding: 12px 24px; text-decoration: none; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; border: 2px solid #0a0a0a; box-shadow: 3px 3px 0px 0px #0a0a0a; }
.category-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
.category-name { font-weight: 600; }
.category-amount { font-family: 'Courier New', monospace; font-weight: 700; }
table.categories { width: 100%; border-collapse: collapse; margin: 12px 0; }
table.categories td { padding: 8px 4px; font-size: 14px; border-bottom: 1px solid #eee; }
table.categories td:last-child { text-align: right; font-family: 'Courier New', monospace; font-weight: 700; }
.persona-badge { display: inline-block; background: #FFFBF5; border: 2px solid #0a0a0a; padding: 8px 16px; font-weight: 800; font-size: 16px; box-shadow: 2px 2px 0px 0px #0a0a0a; }
.footer { background: #f5f5f5; padding: 16px 32px; border-top: 2px solid #0a0a0a; text-align: center; }
.footer p { margin: 0; font-size: 12px; color: #999; }
</style>
</head>
<body>
<div class="container">
${body}
<div class="footer">
<p>Kharcha — See where your money flows</p>
</div>
</div>
</body>
</html>`;
}

// ─── Password Reset ─────────────────────────────────────────────────────────

export interface PasswordResetData {
    userName: string;
    resetUrl: string;
    expiresInMinutes: number;
}

export function renderPasswordReset(data: PasswordResetData): string {
    const body = `
<div class="header">
<h1>🔑 Kharcha</h1>
</div>
<div class="body">
<h2>Hey ${data.userName}!</h2>
<p>We received a request to reset your password. Click the button below to set a new one:</p>
<p style="margin: 24px 0;">
<a href="${data.resetUrl}" class="btn">Reset Password →</a>
</p>
<p style="font-size: 13px; color: #666;">This link expires in <strong>${data.expiresInMinutes} minutes</strong>. If you didn't request this, you can safely ignore this email.</p>
</div>`;

    return wrapLayout("🔑 Kharcha: Reset your password", body);
}

// ─── Upload Reminder ────────────────────────────────────────────────────────

export function renderUploadReminder(data: UploadReminderData): string {
    let statsSection = "";

    if (data.previousMonthStats) {
        const { totalSpend, topCategories, savingsRate } = data.previousMonthStats;
        const catRows = topCategories
            .map((c) => `<tr><td>${c.name}</td><td>${fmtINR(c.amount)}</td></tr>`)
            .join("\n");

        statsSection = `
<p>Last month at a glance:</p>
<div class="stat-card">
<p class="stat-label">Total Spend</p>
<p class="stat-value">${fmtINR(totalSpend)}</p>
</div>
<div class="stat-card">
<p class="stat-label">Savings Rate</p>
<p class="stat-value">${savingsRate}%</p>
</div>
<table class="categories">
${catRows}
</table>`;
    }

    const body = `
<div class="header">
<h1>📊 Kharcha</h1>
</div>
<div class="body">
<h2>Hey ${data.userName}!</h2>
<p>Time to upload your <strong>${data.targetMonth} ${data.targetYear}</strong> expenses! Take screenshots from the Buddy app and upload them to Kharcha.</p>
${statsSection}
<p style="margin-top: 24px;">
<a href="${data.appUrl}/upload" class="btn">Upload Screenshots →</a>
</p>
</div>`;

    return wrapLayout(`📊 Kharcha: Time to upload your ${data.targetMonth} expenses!`, body);
}

// ─── Dashboard Ready ────────────────────────────────────────────────────────

export function renderDashboardReady(data: DashboardReadyData): string {
    const catRows = data.topCategories
        .map((c) => `<tr><td>${c.name}</td><td>${fmtINR(c.amount)}</td></tr>`)
        .join("\n");

    let personaSection = "";
    if (data.personaName && data.personaEmoji) {
        personaSection = `
<p>Your spending persona this month:</p>
<div class="persona-badge">${data.personaEmoji} ${data.personaName}</div>
<p style="margin-top: 16px;">
<a href="${data.appUrl}/persona" class="btn">See Full Persona →</a>
</p>`;
    }

    const body = `
<div class="header">
<h1>✅ Kharcha</h1>
</div>
<div class="body">
<h2>Hey ${data.userName}!</h2>
<p>Your <strong>${data.month} ${data.year}</strong> dashboard is ready!</p>
<div class="stat-card">
<p class="stat-label">Total Spend</p>
<p class="stat-value">${fmtINR(data.totalSpend)}</p>
</div>
<div class="stat-card">
<p class="stat-label">Savings Rate</p>
<p class="stat-value">${data.savingsRate}%</p>
</div>
<p style="margin-top: 16px;"><strong>Top Categories:</strong></p>
<table class="categories">
${catRows}
</table>
${personaSection}
<p style="margin-top: 24px;">
<a href="${data.appUrl}/dashboard" class="btn">View Dashboard →</a>
</p>
</div>`;

    return wrapLayout(`✅ Kharcha: Your ${data.month} dashboard is ready!`, body);
}
