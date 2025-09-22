import { NextRequest, NextResponse } from "next/server";
import { withAuditLogging } from "../../../../../lib/audit/withAuditAccess";
import { getSupabaseServiceClient } from "../../../../../lib/supabase-server";
import { analyzeSlip } from "../../../../../lib/slipAnalysis/analyzeSlip";

// Ensure Node.js runtime (supabase server client + fetch), not Edge
export const runtime = "nodejs";

// POST /api/admin/payments/:id/analyze-slip
// Body: { filePath: string, fileHash?: string }
export const POST = withAuditLogging(
  async (
    request: NextRequest,
    ctx: { params: { id: string } } | { params: Promise<{ id: string }> },
  ) => {
    try {
      const { filePath } = await request.json();
      const maybeParams: any = (ctx as any)?.params;
      const resolvedParams =
        maybeParams && typeof maybeParams.then === "function"
          ? await maybeParams
          : maybeParams;
      const appId: string | undefined = resolvedParams?.id;
      if (
        process.env.PLAYWRIGHT_TEST === "1" ||
        process.env.NODE_ENV === "development"
      ) {
        console.debug("[ANALYZE_SLIP] POST", { appId, filePath });
      }

      if (!appId || !filePath || typeof filePath !== "string") {
        return NextResponse.json(
          { error: "application id and filePath are required" },
          { status: 400 },
        );
      }

      // Run stateless analysis (external analyzer if configured, else mock)
      const analysis = await analyzeSlip(filePath);

      // Fetch expected amount live
      const supabase = getSupabaseServiceClient();
      const { data: reg } = await supabase
        .from("registrations")
        .select("registration_id, price_applied")
        .eq("registration_id", appId)
        .single();

      const expected = reg?.price_applied
        ? typeof reg.price_applied === "string"
          ? parseFloat(reg.price_applied)
          : (reg.price_applied as number)
        : 0;

      const detected =
        typeof analysis.amountDetected === "number"
          ? analysis.amountDetected
          : 0;
      const delta = Number((detected - expected).toFixed(2));
      const status =
        analysis.amountDetected === null
          ? "unknown"
          : Math.abs(delta) <= 1
            ? "match"
            : "mismatch";

      return NextResponse.json({
        ok: true,
        analysis: {
          amountDetected: analysis.amountDetected,
          currency: analysis.currency,
          confidence: analysis.confidence,
          candidates: analysis.candidates,
          analyzerVersion: analysis.analyzerVersion,
        },
        comparison: {
          expectedAmount: expected,
          detectedAmount: analysis.amountDetected,
          delta,
          status,
        },
      });
    } catch (error) {
      console.error("analyze-slip error", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);
