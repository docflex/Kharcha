/**
 * OCR Pipeline Types
 *
 * Core types for the multi-strategy OCR extraction pipeline.
 */

// ─── Extracted Entry ────────────────────────────────────────────────────────

export interface ExtractedEntry {
    category: string;
    amount: number;
    confidence: number;
    sourceImage: string;
    lineIndex: number;
}

// ─── Deduplicated Entry ─────────────────────────────────────────────────────

export interface ConflictDetail {
    amount: number;
    confidence: number;
    source: string;
}

export interface DeduplicatedEntry {
    category: string;
    amount: number;
    confidence: number;
    sourceImage: string;
    lineIndex: number;
    conflict: boolean;
    conflictingAmounts?: ConflictDetail[];
}

// ─── Summary Bar ────────────────────────────────────────────────────────────

export interface SummaryBar {
    income: number | null;
    expenses: number | null;
    left: number | null;
}

// ─── Image Processing ───────────────────────────────────────────────────────

export interface PreprocessOptions {
    targetWidth?: number;
    threshold?: number;
    sharpenSigma?: number;
}

export interface PreprocessResult {
    buffer: Buffer;
    isDarkMode: boolean;
    originalWidth: number;
    originalHeight: number;
}

// ─── OCR Recognition ────────────────────────────────────────────────────────

export interface OcrWord {
    text: string;
    confidence: number;
    bbox: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
}

export interface RecognitionResult {
    text: string;
    words: OcrWord[];
    confidence: number;
}

// ─── Pipeline Results ───────────────────────────────────────────────────────

export interface ImageResult {
    filename: string;
    entries: ExtractedEntry[];
    rawText: string;
    strategy: "line-regex" | "spatial" | "semantic";
    metadata?: {
        month?: string;
        year?: number;
        transactions?: number;
    };
}

export interface BatchResult {
    entries: DeduplicatedEntry[];
    imageResults: ImageResult[];
    summary?: SummaryBar;
    totalConfidence: number;
}

// ─── Extraction Strategy ────────────────────────────────────────────────────

export type ExtractionStrategy = "line-regex" | "spatial" | "semantic";

export interface StrategyResult {
    entries: ExtractedEntry[];
    strategy: ExtractionStrategy;
    averageConfidence: number;
}
