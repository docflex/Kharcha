// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock nodemailer before importing
vi.mock("nodemailer", () => {
    const sendMailMock = vi.fn().mockResolvedValue({
        messageId: "<test-message-id@kharcha.app>",
        accepted: ["user@example.com"],
        rejected: [],
    });
    return {
        default: {
            createTransport: vi.fn().mockReturnValue({
                sendMail: sendMailMock,
                verify: vi.fn().mockResolvedValue(true),
            }),
        },
    };
});

import {
    createEmailTransport,
    sendEmail,
    verifyConnection,
    getEmailConfig,
} from "@/lib/email/client";
import nodemailer from "nodemailer";

describe("Email Client", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getEmailConfig", () => {
        it("returns config from environment variables", () => {
            const original = { ...process.env };
            process.env.SMTP_HOST = "smtp.gmail.com";
            process.env.SMTP_PORT = "587";
            process.env.SMTP_USER = "user@gmail.com";
            process.env.SMTP_PASS = "app-password";
            process.env.EMAIL_FROM = "Kharcha <user@gmail.com>";

            const config = getEmailConfig();

            expect(config).toEqual({
                host: "smtp.gmail.com",
                port: 587,
                user: "user@gmail.com",
                pass: "app-password",
                from: "Kharcha <user@gmail.com>",
            });

            process.env = original;
        });

        it("returns null values for missing env vars", () => {
            const original = { ...process.env };
            delete process.env.SMTP_HOST;
            delete process.env.SMTP_PORT;
            delete process.env.SMTP_USER;
            delete process.env.SMTP_PASS;
            delete process.env.EMAIL_FROM;

            const config = getEmailConfig();

            expect(config.host).toBeUndefined();
            expect(config.port).toBe(587);
            expect(config.user).toBeUndefined();
            expect(config.pass).toBeUndefined();

            process.env = original;
        });
    });

    describe("createEmailTransport", () => {
        it("creates a nodemailer transport with correct config", () => {
            const transport = createEmailTransport({
                host: "smtp.gmail.com",
                port: 587,
                user: "user@gmail.com",
                pass: "app-password",
            });

            expect(nodemailer.createTransport).toHaveBeenCalledWith({
                host: "smtp.gmail.com",
                port: 587,
                secure: false,
                auth: {
                    user: "user@gmail.com",
                    pass: "app-password",
                },
            });

            expect(transport).toBeDefined();
        });

        it("uses port 465 with secure=true", () => {
            createEmailTransport({
                host: "smtp.gmail.com",
                port: 465,
                user: "user@gmail.com",
                pass: "app-password",
            });

            expect(nodemailer.createTransport).toHaveBeenCalledWith(
                expect.objectContaining({
                    port: 465,
                    secure: true,
                })
            );
        });
    });

    describe("sendEmail", () => {
        it("sends an email with correct parameters", async () => {
            const result = await sendEmail({
                to: "user@example.com",
                subject: "Test Subject",
                html: "<p>Test body</p>",
            });

            expect(result.success).toBe(true);
            expect(result.messageId).toBe("<test-message-id@kharcha.app>");
        });

        it("returns failure when sendMail throws", async () => {
            const transport = nodemailer.createTransport();
            vi.mocked(transport.sendMail).mockRejectedValueOnce(new Error("SMTP error"));

            const result = await sendEmail({
                to: "user@example.com",
                subject: "Test",
                html: "<p>Test</p>",
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe("SMTP error");
        });

        it("includes from address from env", async () => {
            const original = process.env.EMAIL_FROM;
            process.env.EMAIL_FROM = "Kharcha <test@kharcha.app>";

            await sendEmail({
                to: "user@example.com",
                subject: "Test",
                html: "<p>Test</p>",
            });

            const transport = nodemailer.createTransport();
            expect(transport.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: "Kharcha <test@kharcha.app>",
                })
            );

            process.env.EMAIL_FROM = original;
        });
    });

    describe("verifyConnection", () => {
        it("returns true when SMTP connection is valid", async () => {
            const result = await verifyConnection();
            expect(result).toBe(true);
        });

        it("returns false when SMTP connection fails", async () => {
            const transport = nodemailer.createTransport();
            vi.mocked(transport.verify).mockRejectedValueOnce(new Error("Connection refused"));

            const result = await verifyConnection();
            expect(result).toBe(false);
        });
    });
});
