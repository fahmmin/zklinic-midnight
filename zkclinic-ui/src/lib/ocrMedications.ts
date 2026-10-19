/**
 * Local OCR using tesseract.js (English). Runs in-browser; first use downloads ~2MB wasm.
 * @see https://github.com/naptha/tesseract.js
 */
export async function recognizeMedicationImage(file: File): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const {
      data: { text }
    } = await worker.recognize(file);
    return text ?? "";
  } finally {
    await worker.terminate();
  }
}
