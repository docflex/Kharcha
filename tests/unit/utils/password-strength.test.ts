// @vitest-environment node
import { describe, it, expect } from "vitest";
import { getPasswordStrength, isPasswordComplex } from "@/lib/utils/password-strength";

describe("getPasswordStrength", () => {
    it("returns weak for empty string", () => {
        const result = getPasswordStrength("");
        expect(result.score).toBe(0);
        expect(result.label).toBe("weak");
    });

    it("returns weak for short lowercase only", () => {
        const result = getPasswordStrength("abc");
        expect(result.score).toBeLessThanOrEqual(1);
        expect(result.label).toBe("weak");
    });

    it("returns fair for 8+ chars with uppercase", () => {
        const result = getPasswordStrength("Abcdefgh");
        expect(result.score).toBe(2);
        expect(result.label).toBe("fair");
    });

    it("returns good for 8+ chars with uppercase and digit", () => {
        const result = getPasswordStrength("Abcdef1h");
        expect(result.score).toBe(3);
        expect(result.label).toBe("good");
    });

    it("returns strong for 8+ chars with all classes", () => {
        const result = getPasswordStrength("Abcdef1!");
        expect(result.score).toBe(4);
        expect(result.label).toBe("strong");
    });

    it("returns strong for 12+ chars with all classes", () => {
        const result = getPasswordStrength("Abcdefgh12!@");
        expect(result.score).toBe(4);
        expect(result.label).toBe("strong");
    });

    it("provides feedback for missing requirements", () => {
        const result = getPasswordStrength("abc");
        expect(result.feedback.length).toBeGreaterThan(0);
        expect(result.feedback.some((f) => f.includes("8 characters"))).toBe(true);
    });

    it("provides no feedback for strong passwords", () => {
        const result = getPasswordStrength("StrongP@ssw0rd!");
        expect(result.feedback).toEqual([]);
    });
});

describe("isPasswordComplex", () => {
    it("rejects short passwords", () => {
        const result = isPasswordComplex("Ab1!");
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Must be at least 8 characters");
    });

    it("rejects passwords without uppercase", () => {
        const result = isPasswordComplex("abcdef1!");
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Must contain an uppercase letter");
    });

    it("rejects passwords without lowercase", () => {
        const result = isPasswordComplex("ABCDEF1!");
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Must contain a lowercase letter");
    });

    it("rejects passwords without digit", () => {
        const result = isPasswordComplex("Abcdefg!");
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Must contain a digit");
    });

    it("rejects passwords without special character", () => {
        const result = isPasswordComplex("Abcdefg1");
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Must contain a special character");
    });

    it("accepts passwords meeting all requirements", () => {
        const result = isPasswordComplex("Abcdef1!");
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
    });

    it("reports multiple failures at once", () => {
        const result = isPasswordComplex("abc");
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
});
