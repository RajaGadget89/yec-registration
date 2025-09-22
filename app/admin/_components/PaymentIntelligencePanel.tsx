"use client";
import React from "react";

type Props = {
  applicationId: string;
  expectedAmount: number;
  slipPath?: string | null;
  analysis?: {
    amountDetected?: number | null;
    confidence?: number;
    status?: "match" | "mismatch" | "pending" | "unknown";
    delta?: number;
  } | null;
};

export function PaymentIntelligencePanel({
  applicationId,
  expectedAmount,
  analysis,
  slipPath,
}: Props) {
  const [state, setState] = React.useState<{
    status: "match" | "mismatch" | "pending" | "unknown";
    amount: number | null;
    confidence: number;
    delta: number | null;
    loading: boolean;
  }>({
    status: analysis?.status || "pending",
    amount: analysis?.amountDetected ?? null,
    confidence: analysis?.confidence ?? 0,
    delta: analysis?.delta ?? null,
    loading: false,
  });

  const status = state.status;
  const amount = state.amount;
  const conf = state.confidence;
  const delta = state.delta;

  const badgeColor =
    status === "match"
      ? "#16a34a"
      : status === "mismatch"
        ? "#dc2626"
        : status === "pending"
          ? "#f59e0b"
          : "#6b7280";

  const statusIcon =
    status === "match"
      ? "✅"
      : status === "mismatch"
        ? "❌"
        : status === "pending"
          ? "⏳"
          : "❔";
  const statusText =
    status === "match"
      ? "ตรงกัน"
      : status === "mismatch"
        ? "ไม่ตรงกัน"
        : status === "pending"
          ? "รอดำเนินการ"
          : "ไม่ชัดเจน";

  const deltaColor =
    typeof delta === "number" && Math.abs(delta) > 1
      ? delta > 0
        ? "#dc2626"
        : "#16a34a"
      : "#374151";

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 14,
        background: "linear-gradient(135deg, #eef2ff 0%, #ffffff 60%)",
        boxShadow: "0 6px 18px rgba(31, 41, 55, 0.08)",
        transition: "transform 120ms ease, box-shadow 200ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong style={{ fontWeight: 700, letterSpacing: 0.2 }}>
          Intelligence Audit
        </strong>
        <span
          style={{
            color: badgeColor,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#fff",
            border: `1px solid ${badgeColor}22`,
            padding: "4px 10px",
            borderRadius: 999,
          }}
        >
          <span aria-hidden>{statusIcon}</span>
          <span>{statusText}</span>
        </span>
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: 14,
          display: "grid",
          rowGap: 6,
          fontVariantNumeric: "tabular-nums" as any,
        }}
      >
        <div>
          <span style={{ color: "#6b7280" }}>ราคาที่คาดหมาย:</span> ฿
          {expectedAmount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
        <div>
          <span style={{ color: "#6b7280" }}>ตรวจพบ:</span>{" "}
          {amount !== null
            ? `฿${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "—"}
          {conf ? ` (ความเชื่อมั่น ${Math.round(conf * 100)}%)` : ""}
        </div>
        {delta !== null && (
          <div>
            <span style={{ color: "#6b7280" }}>ส่วนต่าง:</span>{" "}
            <span style={{ color: deltaColor, fontWeight: 600 }}>
              ฿
              {delta.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        )}
        {conf > 0 && (
          <div style={{ display: "grid", rowGap: 6 }}>
            <div style={{ color: "#6b7280" }}>ความเชื่อมั่นของโมเดล</div>
            <div
              style={{
                background: "#e5e7eb",
                height: 8,
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.round(conf * 100)}%`,
                  height: "100%",
                  background: "linear-gradient(90deg,#60a5fa,#22d3ee)",
                  transition: "width 240ms ease",
                }}
              />
            </div>
          </div>
        )}
      </div>
      <div style={{ marginTop: 10 }}>
        <button
          onClick={async () => {
            try {
              setState((s) => ({ ...s, loading: true }));
              // Use real payment slip path if available on the page context
              // Resolve a signed URL for the slip if we have a storage path
              let filePathToAnalyze: string | null = null;
              const basePath =
                slipPath ||
                (
                  document.querySelector(
                    "[data-payment-slip-path]",
                  ) as HTMLElement | null
                )?.dataset?.paymentSlipPath ||
                null;
              if (basePath && !basePath.startsWith("http")) {
                // Use public signed URL API that accepts filePath only
                const r = await fetch("/api/get-signed-url", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    filePath: basePath,
                    expirySeconds: 900,
                  }),
                });
                const j = await r.json();
                filePathToAnalyze = j?.signedUrl || basePath;
              } else {
                filePathToAnalyze = basePath;
              }
              const demoPath = filePathToAnalyze || "mock/20000.jpg";
              const res = await fetch(
                `/api/admin/payments/${applicationId}/analyze-slip`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ filePath: demoPath }),
                },
              );
              const data = await res.json();
              if (res.ok && data?.analysis && data?.comparison) {
                setState({
                  status: data.comparison.status,
                  amount: data.analysis.amountDetected ?? null,
                  confidence: data.analysis.confidence ?? 0,
                  delta:
                    typeof data.comparison.delta === "number"
                      ? data.comparison.delta
                      : null,
                  loading: false,
                });
              } else {
                setState((s) => ({ ...s, loading: false }));
              }
            } catch {
              setState((s) => ({ ...s, loading: false }));
            }
          }}
          style={{
            background: "linear-gradient(135deg,#38bdf8,#3b82f6)",
            color: "white",
            padding: "8px 12px",
            borderRadius: 8,
            boxShadow: "0 6px 14px rgba(56,189,248,.35)",
            transform: state.loading ? "scale(0.99)" : "scale(1)",
            transition: "transform 120ms ease, box-shadow 200ms ease",
          }}
        >
          {state.loading ? "กำลังวิเคราะห์..." : "วิเคราะห์อีกครั้ง"}{" "}
          {state.loading ? "⏳" : "🔄"}
        </button>
      </div>
    </div>
  );
}

export default PaymentIntelligencePanel;
