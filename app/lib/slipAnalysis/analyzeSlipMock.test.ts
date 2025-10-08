import { describe, it, expect } from "vitest";
import { analyzeSlipMock } from "./analyzeSlipMock";

describe("analyzeSlipMock", () => {
  it("extracts 20000 from comma grouped filename", async () => {
    const res = await analyzeSlipMock("/tmp/slips/KTB_20,000.00.jpg");
    expect(res.amountDetected).toBe(20000);
    expect(res.confidence).toBeGreaterThan(0.8);
  });

  it("extracts 20000 from plain digits filename", async () => {
    const res = await analyzeSlipMock("/tmp/slips/20000.png");
    expect(res.amountDetected).toBe(20000);
  });
});

