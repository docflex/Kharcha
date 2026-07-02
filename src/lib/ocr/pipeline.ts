import path from "path";
import { preprocessImage } from "./preprocessor";
import { recognizeImage } from "./recognizer";
import { parseOcrText } from "./parser";
import { matchCategory } from "./category-matcher";
import { deduplicateEntries } from "./deduplicator";
import type { ExtractedEntry, ImageResult, BatchResult, PreprocessOptions } from "./types";
import { DEFAULT_CATEGORIES } from "../constants";

const KNOWN_CATEGORY_NAMES = DEFAULT_CATEGORIES.map((c) => c.name);

// ─── Single Image Processing ────────────────────────────────────────────────

/**
 * Process a single screenshot through the full OCR pipeline:
 *   1. Preprocess (Sharp)
 *   2. Recognize (Tesseract.js)
 *   3. Parse (line-regex extraction)
 *   4. Normalize categories
 */
export async function processImage(
    input: string | Buffer,
    filename?: string,
    preprocessOptions?: PreprocessOptions
): Promise<ImageResult> {
    const name = filename || (typeof input === "string" ? path.basename(input) : "buffer");

    // Step 1: Preprocess
    const preprocessed = await preprocessImage(input, preprocessOptions);

    // Step 2: OCR
    const recognition = await recognizeImage(preprocessed.buffer);

    // Step 3: Parse
    console.log(
        `[ocr:${name}] Raw text (${recognition.text.length} chars, conf=${(recognition.confidence * 100).toFixed(0)}%):\n${recognition.text}`
    );
    const rawEntries = parseOcrText(recognition.text, name);
    console.log(
        `[ocr:${name}] Parsed ${rawEntries.length} entries:`,
        rawEntries.map((e) => `${e.category}=${e.amount}`)
    );

    // Step 4: Normalize categories + match to known
    // Blend parser confidence with Tesseract OCR confidence and category match score
    const ocrConfidence = recognition.confidence; // Tesseract overall confidence (0-1)
    const entries: ExtractedEntry[] = rawEntries.map((entry) => {
        const matched = matchCategory(entry.category, KNOWN_CATEGORY_NAMES);
        // Weighted blend: 60% parser + 20% category match + 20% Tesseract OCR
        const blended = entry.confidence * 0.6 + matched.confidence * 0.2 + ocrConfidence * 0.2;
        return {
            ...entry,
            category: matched.category,
            confidence: Math.min(blended, 1.0),
        };
    });

    // Extract metadata from raw text (month, year, transactions)
    const metadata = extractMetadata(recognition.text);

    return {
        filename: name,
        entries,
        rawText: recognition.text,
        strategy: "line-regex",
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
}

// ─── Batch Processing ───────────────────────────────────────────────────────

/**
 * Process multiple screenshots as a batch:
 *   1. Process each image individually
 *   2. Deduplicate across all images
 *   3. Calculate total confidence
 */
export async function processBatch(
    inputs: Array<string | Buffer>,
    filenames?: string[],
    preprocessOptions?: PreprocessOptions
): Promise<BatchResult> {
    const imageResults: ImageResult[] = [];

    for (let i = 0; i < inputs.length; i++) {
        const filename = filenames?.[i] || `image_${i}`;
        const result = await processImage(inputs[i], filename, preprocessOptions);
        imageResults.push(result);
    }

    // Deduplicate across all images
    const allEntries = imageResults.map((r) => r.entries);
    const deduped = deduplicateEntries(allEntries);

    // Calculate average confidence
    const totalConfidence =
        deduped.length > 0 ? deduped.reduce((sum, e) => sum + e.confidence, 0) / deduped.length : 0;

    return {
        entries: deduped,
        imageResults,
        totalConfidence,
    };
}

// ─── Metadata Extraction ────────────────────────────────────────────────────

function extractMetadata(text: string): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};

    // Try to find month/year: "January 2026"
    const monthMatch = text.match(
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i
    );
    if (monthMatch) {
        metadata.month = monthMatch[1];
        metadata.year = parseInt(monthMatch[2], 10);
    }

    // Try to find transaction count: "193 TRANSACTIONS"
    const txMatch = text.match(/(\d+)\s+TRANSACTIONS?/i);
    if (txMatch) {
        metadata.transactions = parseInt(txMatch[1], 10);
    }

    return metadata;
}
