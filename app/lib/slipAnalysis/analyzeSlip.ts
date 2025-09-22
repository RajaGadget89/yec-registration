import { analyzeSlipMock, AnalyzeResult } from "./analyzeSlipMock";
import { analyzeSlipGCV } from "./analyzeSlipGCV";

/**
 * Pluggable analyzer wrapper.
 * - If SLIP_ANALYZER_URL is set, calls external service { POST /analyze { filePath } }.
 * - Otherwise falls back to mock analyzer.
 */
export async function analyzeSlip(filePath: string): Promise<AnalyzeResult> {
  if (process.env.GCV_OCR_ENABLED === "1") {
    try {
      return await analyzeSlipGCV(filePath);
    } catch (err) {
      console.warn(
        "[analyzeSlip] GCV failed, falling back to external/mock",
        err,
      );
    }
  }
  const serviceUrl = process.env.SLIP_ANALYZER_URL;
  if (serviceUrl) {
    try {
      const res = await fetch(`${serviceUrl.replace(/\/$/, "")}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.amountDetected !== "undefined") {
          return {
            amountDetected: data.amountDetected,
            currency: data.currency || "THB",
            confidence: data.confidence ?? 0,
            candidates: data.candidates || [],
            analyzerVersion: data.analyzerVersion || "external",
          };
        }
      }
    } catch (error) {
      console.warn(
        "[analyzeSlip] external analyzer failed, falling back to mock",
        error,
      );
    }
  }

  return await analyzeSlipMock(filePath);
}
