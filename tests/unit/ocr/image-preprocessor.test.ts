// @vitest-environment node
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { preprocessImage } from "@/lib/ocr/preprocessor";

const FIXTURES_DIR = path.resolve(__dirname, "../../fixtures/screenshots");

function fixturePath(filename: string): string {
    return path.join(FIXTURES_DIR, filename);
}

describe("Image Preprocessor", () => {
    describe("preprocessImage", () => {
        it("returns a buffer from a file path", async () => {
            const result = await preprocessImage(fixturePath("IMG_2806.PNG"));
            expect(result.buffer).toBeInstanceOf(Buffer);
            expect(result.buffer.length).toBeGreaterThan(0);
        });

        it("returns a buffer from a Buffer input", async () => {
            const inputBuffer = fs.readFileSync(fixturePath("IMG_2806.PNG"));
            const result = await preprocessImage(inputBuffer);
            expect(result.buffer).toBeInstanceOf(Buffer);
            expect(result.buffer.length).toBeGreaterThan(0);
        });

        it("detects dark mode screenshots correctly", async () => {
            // IMG_2806 is a dark-mode Buddy screenshot
            const result = await preprocessImage(fixturePath("IMG_2806.PNG"));
            expect(result.isDarkMode).toBe(true);
        });

        it("records original dimensions", async () => {
            const result = await preprocessImage(fixturePath("IMG_2806.PNG"));
            expect(result.originalWidth).toBeGreaterThan(0);
            expect(result.originalHeight).toBeGreaterThan(0);
        });

        it("normalizes output to target width", async () => {
            const result = await preprocessImage(fixturePath("IMG_2806.PNG"), {
                targetWidth: 800,
            });
            const meta = await sharp(result.buffer).metadata();
            expect(meta.width).toBeLessThanOrEqual(800);
        });

        it("converts output to grayscale", async () => {
            const result = await preprocessImage(fixturePath("IMG_2806.PNG"));
            // Extract raw pixel data — in a grayscale image all pixels should
            // have R=G=B when read as RGB.
            const { data, info } = await sharp(result.buffer)
                .raw()
                .toBuffer({ resolveWithObject: true });
            const channels = info.channels;
            // Sample first 10 pixels — each should be uniform across channels
            for (let i = 0; i < Math.min(10, info.width); i++) {
                const offset = i * channels;
                if (channels >= 3) {
                    expect(data[offset]).toBe(data[offset + 1]); // R == G
                    expect(data[offset]).toBe(data[offset + 2]); // R == B
                }
            }
        });

        it("produces a PNG buffer", async () => {
            const result = await preprocessImage(fixturePath("IMG_2806.PNG"));
            const meta = await sharp(result.buffer).metadata();
            expect(meta.format).toBe("png");
        });

        it("handles the overview screenshot (IMG_2810) with pink gradient", async () => {
            const result = await preprocessImage(fixturePath("IMG_2810.PNG"));
            expect(result.buffer).toBeInstanceOf(Buffer);
            expect(result.buffer.length).toBeGreaterThan(0);
        });

        it("works with different screenshot types (all 9 fixtures)", async () => {
            const files = fs.readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".PNG"));
            expect(files.length).toBe(9);

            for (const file of files) {
                const result = await preprocessImage(fixturePath(file));
                expect(result.buffer).toBeInstanceOf(Buffer);
                expect(result.buffer.length).toBeGreaterThan(0);
            }
        });

        it("respects custom preprocessing options", async () => {
            const result = await preprocessImage(fixturePath("IMG_2806.PNG"), {
                targetWidth: 600,
                threshold: 150,
                sharpenSigma: 2.0,
            });
            const meta = await sharp(result.buffer).metadata();
            expect(meta.width).toBeLessThanOrEqual(600);
        });
    });
});
