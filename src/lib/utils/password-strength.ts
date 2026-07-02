/**
 * Password strength scoring utility.
 * Returns a score (0-4) and label (weak/fair/good/strong).
 */

export type PasswordStrength = {
    score: number; // 0-4
    label: "weak" | "fair" | "good" | "strong";
    feedback: string[];
};

export function getPasswordStrength(password: string): PasswordStrength {
    const feedback: string[] = [];
    let score = 0;

    if (password.length === 0) {
        return { score: 0, label: "weak", feedback: ["Enter a password"] };
    }

    // Length checks
    if (password.length >= 8) score++;
    else feedback.push("At least 8 characters");

    if (password.length >= 12) score++;

    // Character class checks
    if (/[A-Z]/.test(password)) score++;
    else feedback.push("Add an uppercase letter");

    if (/[a-z]/.test(password)) {
        // no score bonus, but required
    } else {
        feedback.push("Add a lowercase letter");
    }

    if (/[0-9]/.test(password)) score++;
    else feedback.push("Add a number");

    if (/[^A-Za-z0-9]/.test(password)) score++;
    else feedback.push("Add a special character");

    // Cap at 4
    score = Math.min(score, 4);

    let label: PasswordStrength["label"];
    if (score <= 1) label = "weak";
    else if (score === 2) label = "fair";
    else if (score === 3) label = "good";
    else label = "strong";

    return { score, label, feedback };
}

/**
 * Validates that a password meets minimum complexity requirements:
 * - Min 8 chars
 * - At least 1 uppercase
 * - At least 1 lowercase
 * - At least 1 digit
 * - At least 1 special character
 */
export function isPasswordComplex(password: string): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    if (password.length < 8) errors.push("Must be at least 8 characters");
    if (!/[A-Z]/.test(password)) errors.push("Must contain an uppercase letter");
    if (!/[a-z]/.test(password)) errors.push("Must contain a lowercase letter");
    if (!/[0-9]/.test(password)) errors.push("Must contain a digit");
    if (!/[^A-Za-z0-9]/.test(password)) errors.push("Must contain a special character");

    return { valid: errors.length === 0, errors };
}
