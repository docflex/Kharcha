import sharp from "sharp";
import fs from "fs";
import type { PreprocessOptions, PreprocessResult } from "./types";

const DEFAULT_OPTIONS: Required<PreprocessOptions> = {
    targetWidth: 1080,
    threshold: 180,
    sharpenSigma: 1.5,
};

/**
 * Pre-process a screenshot for OCR.
 *
 * Pipeline:
 *   1. Normalize width
 *   2. Convert to grayscale
 *   3. Auto-detect dark mode → negate if dark
 *   4. Auto-contrast (normalize)
 *   5. Sharpen for crisper text edges
 *   6. Threshold to clean up noise
 *
 * Accepts a file path (string) or a Buffer.
 */
export async function preprocessImage(
    input: string | Buffer,
    options?: PreprocessOptions
): Promise<PreprocessResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Load the image
    const inputBuffer = typeof input === "string" ? fs.readFileSync(input) : input;

    const image = sharp(inputBuffer);
    const metadata = await image.metadata();

    const originalWidth = metadata.width ?? 0;
    const originalHeight = metadata.height ?? 0;

    // Step 1: Normalize dimensions
    let processed = sharp(inputBuffer).resize({
        width: opts.targetWidth,
        withoutEnlargement: true,
        fit: "inside",
    });

    // Step 2: Convert to grayscale
    processed = processed.grayscale();

    // Step 3: Auto-detect dark mode
    // We need stats from the grayscale version to detect brightness
    const grayscaleBuffer = await sharp(inputBuffer)
        .resize({ width: opts.targetWidth, withoutEnlargement: true, fit: "inside" })
        .grayscale()
        .toBuffer();

    const stats = await sharp(grayscaleBuffer).stats();
    const avgBrightness = stats.channels[0].mean;
    const isDarkMode = avgBrightness < 128;

    // Step 4: If dark mode, negate for better OCR (dark text on light bg)
    // Re-apply grayscale after negate since negate expands to 3 channels
    if (isDarkMode) {
        processed = sharp(grayscaleBuffer).negate().grayscale();
    } else {
        processed = sharp(grayscaleBuffer);
    }

    // Step 5: Auto-contrast stretch
    processed = processed.normalize();

    // Step 6: Sharpen for crisper text edges
    processed = processed.sharpen({ sigma: opts.sharpenSigma });

    // Step 7: Threshold to clean up
    processed = processed.threshold(opts.threshold);

    const buffer = await processed.png().toBuffer();

    return {
        buffer,
        isDarkMode,
        originalWidth,
        originalHeight,
    };
}
