/**
 * File validation utilities: magic byte checks + filename sanitization.
 */

// ─── Magic Bytes ────────────────────────────────────────────────────────────

const MAGIC_BYTES: Record<string, number[]> = {
    "image/png": [0x89, 0x50, 0x4e, 0x47],
    "image/jpeg": [0xff, 0xd8, 0xff],
    "application/pdf": [0x25, 0x50, 0x44, 0x46],
};

/**
 * Validate that a file's content matches its claimed MIME type
 * by checking magic bytes (file signature).
 *
 * @returns `true` if valid, `false` if content doesn't match claimed type
 */
export function validateMagicBytes(buffer: Buffer | Uint8Array, claimedType: string): boolean {
    const expectedBytes = MAGIC_BYTES[claimedType];

    // If we don't have a signature for this type, skip validation
    if (!expectedBytes) return true;

    if (buffer.length < expectedBytes.length) return false;

    return expectedBytes.every((byte, i) => buffer[i] === byte);
}

/**
 * Detect MIME type from magic bytes.
 * Returns the detected type or null if unknown.
 */
export function detectMimeType(buffer: Buffer | Uint8Array): string | null {
    for (const [mimeType, signature] of Object.entries(MAGIC_BYTES)) {
        if (buffer.length >= signature.length && signature.every((byte, i) => buffer[i] === byte)) {
            return mimeType;
        }
    }
    return null;
}

// ─── Filename Sanitization ──────────────────────────────────────────────────

/**
 * Sanitize a filename by removing dangerous characters.
 * Keeps only alphanumeric, dots, and hyphens. Truncates to 100 chars.
 */
export function sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9.\-]/g, "_").slice(0, 100);
}
