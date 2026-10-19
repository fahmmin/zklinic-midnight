/**
 * Local OCR for doctor certificate images (English).
 * Reuses tesseract loading pattern from medications OCR.
 */
export async function recognizeDoctorCertificateImage(file) {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    try {
        const { data: { text } } = await worker.recognize(file);
        return text ?? "";
    }
    finally {
        await worker.terminate();
    }
}
