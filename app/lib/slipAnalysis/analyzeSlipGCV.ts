import type { AnalyzeResult } from "./analyzeSlipMock";

function pickAmount(text: string): number | null {
  const lines = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const LABEL_RE =
    /(จำนวน.?เงิน|ยอดรวม|ยอดโอน|ยอดชำระ|รวม(?:ทั้งสิ้น)?|Amount|Total)/i;
  const CURRENCY_RE = /(บาท|THB|฿)/i;
  const NUM_RE = /([\d]{1,3}(?:,[\d]{3})+|[\d]{4,})(?:\.[\d]{1,2})?/g;

  type Cand = { amount: number; score: number };
  const candidates: Cand[] = [];

  const pushMatches = (line: string, base: number) => {
    const seen: Set<string> = new Set();
    for (const m of line.matchAll(NUM_RE)) {
      const raw = m[0];
      if (seen.has(raw)) continue;
      seen.add(raw);
      const amount = Number(raw.replace(/,/g, ""));
      // Filter out absurd values (e.g., long concatenations)
      if (!Number.isFinite(amount)) continue;
      if (amount <= 0) continue;
      if (amount > 1_000_000) continue; // sanity cap

      let score = base;
      if (/\.\d{2}$/.test(raw)) score += 0.1; // 2-decimal typical
      candidates.push({ amount, score });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hasLabel = LABEL_RE.test(line);
    const hasCurrency = CURRENCY_RE.test(line);
    const base = 0.5 + (hasLabel ? 0.4 : 0) + (hasCurrency ? 0.3 : 0);
    if (hasLabel || hasCurrency) {
      // Same line and next line window
      pushMatches(line, base);
      if (i + 1 < lines.length) pushMatches(lines[i + 1], base - 0.1);
    }
  }

  // Fallback: global scan with low score
  if (candidates.length === 0) {
    pushMatches(text, 0.3);
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) =>
    a.score === b.score ? a.amount - b.amount : a.score - b.score,
  );
  const best = candidates[candidates.length - 1];
  return Math.round(best.amount * 100) / 100;
}

export async function analyzeSlipGCV(filePath: string): Promise<AnalyzeResult> {
  const { ImageAnnotatorClient } = await import("@google-cloud/vision");
  const fs = await import("fs");
  const client = new ImageAnnotatorClient(
    process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY
      ? {
          credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(
              /\\n/g,
              "\n",
            ),
          },
          projectId: process.env.GOOGLE_PROJECT_ID,
        }
      : undefined,
  );

  const req = filePath.startsWith("http")
    ? {
        image: { source: { imageUri: filePath } },
        imageContext: { languageHints: ["th", "en"] },
      }
    : {
        image: { content: fs.readFileSync(filePath) },
        imageContext: { languageHints: ["th", "en"] },
      };

  const [res] = await client.documentTextDetection(req as any);
  const text = (res as any).fullTextAnnotation?.text ?? "";
  const amount = pickAmount(text);

  return {
    amountDetected: amount,
    currency: "THB",
    confidence: amount ? 0.9 : 0.0,
    candidates: amount ? [{ amount, confidence: 0.9, label: "GCV" }] : [],
    analyzerVersion: "gcv-v1",
  };
}
