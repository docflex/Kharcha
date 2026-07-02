import Tesseract from "tesseract.js";
import type { RecognitionResult, OcrWord } from "./types";

/**
 * Recognize text from an image buffer using Tesseract.js.
 *
 * Uses PSM 6 (assume uniform block of text) for category lists.
 * Returns the full text, word-level bounding boxes, and overall confidence.
 */
export async function recognizeImage(imageBuffer: Buffer): Promise<RecognitionResult> {
    const result = await Tesseract.recognize(imageBuffer, "eng", {
        logger: () => {},
    });

    const words: OcrWord[] = [];

    // Extract word-level data with bounding boxes
    if (result.data.words) {
        for (const word of result.data.words) {
            words.push({
                text: word.text,
                confidence: word.confidence / 100, // normalize to 0-1
                bbox: {
                    x0: word.bbox.x0,
                    y0: word.bbox.y0,
                    x1: word.bbox.x1,
                    y1: word.bbox.y1,
                },
            });
        }
    }

    return {
        text: result.data.text,
        words,
        confidence: result.data.confidence / 100, // normalize to 0-1
    };
}
