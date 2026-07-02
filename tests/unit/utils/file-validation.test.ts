// @vitest-environment node
import { describe, it, expect } from "vitest";
import { validateMagicBytes, detectMimeType, sanitizeFilename } from "@/lib/utils/file-validation";

describe("validateMagicBytes", () => {
    it("validates a valid PNG file", () => {
        const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
        expect(validateMagicBytes(pngHeader, "image/png")).toBe(true);
    });

    it("rejects an invalid PNG file", () => {
        const fakeFile = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
        expect(validateMagicBytes(fakeFile, "image/png")).toBe(false);
    });

    it("validates a valid JPEG file", () => {
        const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
        expect(validateMagicBytes(jpegHeader, "image/jpeg")).toBe(true);
    });

    it("rejects an invalid JPEG file", () => {
        const fakeFile = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
        expect(validateMagicBytes(fakeFile, "image/jpeg")).toBe(false);
    });

    it("validates a valid PDF file", () => {
        const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
        expect(validateMagicBytes(pdfHeader, "application/pdf")).toBe(true);
    });

    it("rejects a buffer too small for the signature", () => {
        const tinyBuffer = Buffer.from([0x89, 0x50]);
        expect(validateMagicBytes(tinyBuffer, "image/png")).toBe(false);
    });

    it("returns true for unknown MIME types (skip validation)", () => {
        const buffer = Buffer.from([0x00, 0x01, 0x02]);
        expect(validateMagicBytes(buffer, "application/octet-stream")).toBe(true);
    });
});

describe("detectMimeType", () => {
    it("detects PNG", () => {
        const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
        expect(detectMimeType(png)).toBe("image/png");
    });

    it("detects JPEG", () => {
        const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
        expect(detectMimeType(jpeg)).toBe("image/jpeg");
    });

    it("detects PDF", () => {
        const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
        expect(detectMimeType(pdf)).toBe("application/pdf");
    });

    it("returns null for unknown types", () => {
        const unknown = Buffer.from([0x00, 0x01, 0x02, 0x03]);
        expect(detectMimeType(unknown)).toBeNull();
    });
});

describe("sanitizeFilename", () => {
    it("keeps safe characters", () => {
        expect(sanitizeFilename("file-name.png")).toBe("file-name.png");
    });

    it("replaces spaces with underscores", () => {
        expect(sanitizeFilename("my file.png")).toBe("my_file.png");
    });

    it("replaces special characters", () => {
        expect(sanitizeFilename("file@#$.png")).toBe("file___.png");
    });

    it("truncates to 100 characters", () => {
        const longName = "a".repeat(150) + ".png";
        expect(sanitizeFilename(longName).length).toBe(100);
    });

    it("handles unicode characters", () => {
        expect(sanitizeFilename("खर्चा-screenshot.png")).toBe("_____-screenshot.png");
    });
});
