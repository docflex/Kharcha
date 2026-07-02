// @vitest-environment node
import { describe, it, expect } from "vitest";
import path from "path";
import { recognizeImage } from "@/lib/ocr/recognizer";
import { preprocessImage } from "@/lib/ocr/preprocessor";

const FIXTURES_DIR = path.resolve(__dirname, "../../fixtures/screenshots");

function fixturePath(filename: string): string {
    return path.join(FIXTURES_DIR, filename);
}

describe("Tesseract.js Recognizer", () => {
    // These tests use real OCR — they are slow (~5-10s each).
    // They run against preprocessed images.

    it("extracts text from a preprocessed category list screenshot", async () => {
        const preprocessed = await preprocessImage(fixturePath("IMG_2806.PNG"));
        const result = await recognizeImage(preprocessed.buffer);

        expect(result.text).toBeTruthy();
        expect(result.text.length).toBeGreaterThan(50);
        expect(result.confidence).toBeGreaterThan(0);
    }, 30000);

    it("extracts text containing category names from IMG_2806", async () => {
        const preprocessed = await preprocessImage(fixturePath("IMG_2806.PNG"));
        const result = await recognizeImage(preprocessed.buffer);
        const text = result.text.toLowerCase();

        // Should find at least some known categories
        const knownCategories = ["investments", "rent", "food", "groceries"];
        const found = knownCategories.filter((c) => text.includes(c));
        expect(found.length).toBeGreaterThanOrEqual(2);
    }, 30000);

    it("extracts text containing amounts with ₹ or digits", async () => {
        const preprocessed = await preprocessImage(fixturePath("IMG_2806.PNG"));
        const result = await recognizeImage(preprocessed.buffer);

        // Should find digit patterns that look like amounts
        const amountPattern = /\d[\d,]*\.?\d*/g;
        const amounts = result.text.match(amountPattern);
        expect(amounts).not.toBeNull();
        expect(amounts!.length).toBeGreaterThanOrEqual(3);
    }, 30000);

    it("returns word-level bounding boxes", async () => {
        const preprocessed = await preprocessImage(fixturePath("IMG_2806.PNG"));
        const result = await recognizeImage(preprocessed.buffer);

        expect(result.words.length).toBeGreaterThan(0);
        const word = result.words[0];
        expect(word.text).toBeTruthy();
        expect(word.bbox).toBeDefined();
        expect(typeof word.bbox.x0).toBe("number");
        expect(typeof word.bbox.y0).toBe("number");
    }, 30000);

    it("handles the overview screenshot (IMG_2810)", async () => {
        const preprocessed = await preprocessImage(fixturePath("IMG_2810.PNG"));
        const result = await recognizeImage(preprocessed.buffer);

        expect(result.text).toBeTruthy();
        // Should find "January" or "2026" or "INVESTMENTS"
        const text = result.text.toLowerCase();
        const signals = ["january", "2026", "investment", "income", "expense"];
        const found = signals.filter((s) => text.includes(s));
        expect(found.length).toBeGreaterThanOrEqual(1);
    }, 30000);

    it("works with a raw (unpreprocessed) buffer", async () => {
        const fs = await import("fs");
        const rawBuffer = fs.readFileSync(fixturePath("IMG_2807.PNG"));
        const result = await recognizeImage(rawBuffer);

        expect(result.text).toBeTruthy();
        expect(result.text.length).toBeGreaterThan(20);
    }, 30000);
});
