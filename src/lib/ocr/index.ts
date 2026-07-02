export { preprocessImage } from "./preprocessor";
export { recognizeImage } from "./recognizer";
export { parseOcrText, isNoiseLine, isBudgetTogetherEntry, extractAmountFromLine } from "./parser";
export { normalizeCategory, matchCategory, CATEGORY_ALIASES } from "./category-matcher";
export { deduplicateEntries } from "./deduplicator";
export { processImage, processBatch } from "./pipeline";
export type {
    ExtractedEntry,
    DeduplicatedEntry,
    ConflictDetail,
    SummaryBar,
    PreprocessOptions,
    PreprocessResult,
    OcrWord,
    RecognitionResult,
    ImageResult,
    BatchResult,
    ExtractionStrategy,
    StrategyResult,
} from "./types";
