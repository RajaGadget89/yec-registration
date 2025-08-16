import { EventHandler, RegistrationEvent } from "../types";
import { hasTelegramConfig } from "../../config";
import { TelegramService } from "../../telegramService";

/**
 * Handler for sending Telegram notifications based on events
 * Uses centralized configuration and appropriate message templates
 */
export class TelegramNotificationHandler
  implements EventHandler<RegistrationEvent>
{
  async handle(event: RegistrationEvent): Promise<void> {
    // Check if Telegram configuration is available
    // Allow test mode even without credentials
    const isTestMode =
      process.env.NODE_ENV === "test" ||
      process.env.TEST_HELPERS_ENABLED === "1";

    if (!hasTelegramConfig() && !isTestMode) {
      console.warn(
        "Telegram configuration not available and not in test mode, skipping Telegram notification",
      );
      return;
    }

    if (isTestMode) {
      console.log(
        "[TELEGRAM-HANDLER] Running in test mode, proceeding with notification",
      );
    }

    try {
      switch (event.type) {
        case "registration.submitted":
          await this.handleRegistrationSubmitted(event);
          break;

        case "registration.batch_upserted":
          await this.handleBatchUpserted(event);
          break;

        case "admin.request_update":
          await this.handleAdminRequestUpdate(event);
          break;

        case "admin.approved":
          await this.handleAdminApproved(event);
          break;

        case "admin.rejected":
          await this.handleAdminRejected(event);
          break;

        default:
          console.warn(
            `Unhandled event type in TelegramNotificationHandler: ${(event as any).type}`,
          );
      }
    } catch (error) {
      console.error("TelegramNotificationHandler error:", error);
      throw error;
    }
  }

  private async handleRegistrationSubmitted(
    event: RegistrationEvent,
  ): Promise<void> {
    if (event.type !== "registration.submitted") return;

    console.log(
      "[TELEGRAM-HANDLER] Processing registration.submitted event...",
    );

    const { registration } = event.payload;
    const fullName = `${registration.title} ${registration.first_name} ${registration.last_name}`;

    console.log("[TELEGRAM-HANDLER] Registration data:", {
      fullName,
      email: registration.email,
      registrationId: registration.registration_id,
      province: registration.yec_province,
      companyName: registration.company_name,
      businessType: registration.business_type,
    });

    console.log("[TELEGRAM-HANDLER] About to get TelegramService instance...");
    const telegramService = TelegramService.getInstance();
    console.log("[TELEGRAM-HANDLER] TelegramService instance created");

    console.log("[TELEGRAM-HANDLER] About to call notifyNewRegistration...");
    const result = await telegramService.notifyNewRegistration({
      fullName,
      email: registration.email,
      registrationId: registration.registration_id,
      province: registration.yec_province,
      companyName: registration.company_name,
      businessType: registration.business_type,
    });

    console.log(
      `[TELEGRAM-HANDLER] Registration submitted Telegram notification sent, result: ${result}`,
    );
    console.log("[TELEGRAM-HANDLER] Method completed successfully");
  }

  private async handleBatchUpserted(event: RegistrationEvent): Promise<void> {
    if (event.type !== "registration.batch_upserted") return;

    const { registration, admin_email } = event.payload;
    const registrations = [registration]; // Convert single registration to array for compatibility

    const message =
      `📦 Batch Registration Update\n\n` +
      `Updated ${registrations.length} registrations\n` +
      `Admin: ${admin_email || "Unknown"}\n` +
      `Status: Set to waiting_for_review\n\n` +
      `First few registrations:\n` +
      registrations
        .slice(0, 3)
        .map(
          (r: any) =>
            `• ${r.title} ${r.first_name} ${r.last_name} (${r.registration_id})`,
        )
        .join("\n") +
      (registrations.length > 3
        ? `\n... and ${registrations.length - 3} more`
        : "");

    // Use the legacy sendTelegram for now (can be updated later)
    const { sendTelegram } = await import("../../notify");
    await sendTelegram(message);
    console.log(
      `Batch upsert Telegram notification sent for ${registrations.length} registrations`,
    );
  }

  private async handleAdminRequestUpdate(
    event: RegistrationEvent,
  ): Promise<void> {
    if (event.type !== "admin.request_update") return;

    const { registration, admin_email } = event.payload;
    const fullName = `${registration.title} ${registration.first_name} ${registration.last_name}`;

    const message =
      `🔄 Update Requested\n\n` +
      `Name: ${fullName}\n` +
      `Email: ${registration.email}\n` +
      `Registration ID: ${registration.registration_id}\n` +
      `Requested by: ${admin_email || "Unknown"}\n` +
      `Status: Set to pending`;

    // Use the legacy sendTelegram for now (can be updated later)
    const { sendTelegram } = await import("../../notify");
    await sendTelegram(message);
    console.log(`Request update Telegram notification sent`);
  }

  private async handleAdminApproved(event: RegistrationEvent): Promise<void> {
    if (event.type !== "admin.approved") return;

    const { registration, admin_email } = event.payload;
    const fullName = `${registration.title} ${registration.first_name} ${registration.last_name}`;

    const message =
      `✅ Registration Approved\n\n` +
      `Name: ${fullName}\n` +
      `Email: ${registration.email}\n` +
      `Registration ID: ${registration.registration_id}\n` +
      `Approved by: ${admin_email || "Unknown"}\n` +
      `Status: Set to approved`;

    // Use the legacy sendTelegram for now (can be updated later)
    const { sendTelegram } = await import("../../notify");
    await sendTelegram(message);
    console.log(`Approval Telegram notification sent`);
  }

  private async handleAdminRejected(event: RegistrationEvent): Promise<void> {
    if (event.type !== "admin.rejected") return;

    const { registration, admin_email, reason } = event.payload;
    const fullName = `${registration.title} ${registration.first_name} ${registration.last_name}`;

    const message =
      `❌ Registration Rejected\n\n` +
      `Name: ${fullName}\n` +
      `Email: ${registration.email}\n` +
      `Registration ID: ${registration.registration_id}\n` +
      `Rejected by: ${admin_email || "Unknown"}\n` +
      `Status: Set to rejected` +
      (reason ? `\nReason: ${reason}` : "");

    // Use the legacy sendTelegram for now (can be updated later)
    const { sendTelegram } = await import("../../notify");
    await sendTelegram(message);
    console.log(`Rejection Telegram notification sent`);
  }
}
