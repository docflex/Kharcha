import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export interface EmailConfig {
    host: string | undefined;
    port: number;
    user: string | undefined;
    pass: string | undefined;
    from?: string | undefined;
}

export interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
}

export interface SendEmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Read email config from environment variables.
 */
export function getEmailConfig(): EmailConfig {
    return {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.EMAIL_FROM,
    };
}

/**
 * Check whether email is configured (all required env vars present).
 */
export function isEmailConfigured(): boolean {
    const config = getEmailConfig();
    return !!(config.host && config.user && config.pass);
}

/**
 * Create a Nodemailer transport with the given config.
 */
export function createEmailTransport(
    config?: Partial<Pick<EmailConfig, "host" | "port" | "user" | "pass">>
): Transporter {
    const { host, port, user, pass } = { ...getEmailConfig(), ...config };

    return nodemailer.createTransport({
        host: host!,
        port,
        secure: port === 465,
        auth: {
            user: user!,
            pass: pass!,
        },
    });
}

// Singleton transport — lazily created
let _transport: Transporter | null = null;

function getTransport(): Transporter {
    if (!_transport) {
        _transport = createEmailTransport();
    }
    return _transport;
}

/**
 * Send an email. Returns success/failure with messageId or error.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
        const transport = getTransport();
        const config = getEmailConfig();

        const info = await transport.sendMail({
            from: config.from || `Kharcha <${config.user}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
        });

        return {
            success: true,
            messageId: info.messageId,
        };
    } catch (_error) {
        return {
            success: false,
            error: _error instanceof Error ? _error.message : "Unknown email error",
        };
    }
}

/**
 * Verify the SMTP connection is working.
 * Times out after 5 seconds to avoid hanging the UI.
 */
export async function verifyConnection(): Promise<boolean> {
    try {
        const transport = getTransport();
        const result = await Promise.race([
            transport.verify().then(() => true),
            new Promise<false>((resolve) => setTimeout(() => resolve(false), 5000)),
        ]);
        return result;
    } catch (error) {
        console.error(
            "[email] SMTP verify failed:",
            error instanceof Error ? error.message : error
        );
        return false;
    }
}

/**
 * Reset the singleton transport (useful for tests and config changes).
 */
export function resetTransport(): void {
    _transport = null;
}
