/**
 * Minimal stateless analyzer mock.
 * - Does NOT read the image; simply attempts to infer an amount from the filePath string
 *   so we can wire the end-to-end flow without external deps.
 * - Replace with PaddleOCR-based analyzer in a later step.
 */

export interface AnalyzeResult {
  amountDetected: number | null;
  currency: "THB";
  confidence: number; // 0..1
  candidates: Array<{ amount: number; confidence: number; label?: string }>;
  analyzerVersion: string;
}

export async function analyzeSlipMock(
  filePath: string,
): Promise<AnalyzeResult> {
  // Try to find a number-like token in the path, e.g., 20,000.00 or 20000
  // Handles either comma-grouped or plain 4+ digits with optional decimals
  const m = filePath.match(
    /([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,})(?:\.[0-9]{1,2})?/,
  );
  const amount = m ? parseFloat(m[0].replace(/,/g, "")) : null;

  const amountDetected = Number.isFinite(amount as number)
    ? (amount as number)
    : null;
  const confidence = amountDetected !== null ? 0.9 : 0.0;

  return {
    amountDetected,
    currency: "THB",
    confidence,
    candidates:
      amountDetected !== null ? [{ amount: amountDetected, confidence }] : [],
    analyzerVersion: "mock-v0",
  };
}
