import { EventHandler } from "../types";
import { RegistrationEvent } from "../types";
import { EventFactory } from "../eventFactory";
import { EventService } from "../eventService";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";

/**
 * Handler for payment slip intelligence events.
 * PoC implementation: persists analysis JSON if provided and compares with expected amount.
 * If no analyzer is configured, the analyze-requested event is acknowledged without side-effects.
 */
export class PaymentSlipHandler implements EventHandler<RegistrationEvent> {
  async handle(event: RegistrationEvent): Promise<void> {
    switch (event.type) {
      case "payment.slip_analyze_requested":
        await this.handleAnalyzeRequested(event as any);
        break;
      case "payment.slip_analyzed":
        await this.handleAnalyzed(event as any);
        break;
      default:
        return;
    }
  }

  private async handleAnalyzeRequested(event: any): Promise<void> {
    // For initial PoC, we only acknowledge the request. The external analyzer (next phase)
    // should call back/emits payment.slip_analyzed with results.
    console.log("[PaymentSlipHandler] analyze requested", event.payload);
  }

  private async handleAnalyzed(event: any): Promise<void> {
    const supabase = getSupabaseServiceClient();
    const {
      application_id,
      amount_detected,
      confidence,
      file_path,
      analyzer_version,
      candidates: _candidates,
    } = event.payload || {};

    try {
      // Persist raw analysis JSON (soft-fail if table missing)
      try {
        await supabase.from("payment_slip_analysis").insert({
          application_id,
          file_path,
          result_json: event.payload,
          analyzer_version,
        });
      } catch (e) {
        console.warn(
          "[PaymentSlipHandler] persist skipped:",
          (e as any)?.message,
        );
      }

      if (typeof amount_detected !== "number") {
        console.warn("[PaymentSlipHandler] No amount_detected to compare");
        return;
      }

      // Fetch expected price from registrations.price_applied
      const { data: reg, error } = await supabase
        .from("registrations")
        .select("price_applied, registration_id")
        .eq("registration_id", application_id)
        .single();
      if (error || !reg) {
        console.warn(
          "[PaymentSlipHandler] registration not found",
          application_id,
        );
        return;
      }

      const expected =
        typeof reg.price_applied === "string"
          ? parseFloat(reg.price_applied)
          : (reg.price_applied as number) || 0;

      const delta = Number((amount_detected - expected).toFixed(2));
      const comparePayload = {
        application_id,
        expected_amount: expected,
        detected_amount: amount_detected,
        delta,
        confidence: typeof confidence === "number" ? confidence : 0,
      };

      const evt =
        Math.abs(delta) <= 1
          ? EventFactory.createPaymentAmountMatch(comparePayload)
          : EventFactory.createPaymentAmountMismatch(comparePayload);
      await EventService.emit(evt);
    } catch (err) {
      console.error("[PaymentSlipHandler] error", err);
    }
  }
}
