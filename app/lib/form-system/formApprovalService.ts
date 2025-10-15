import { createClient } from "@/app/lib/supabase/server";
import { EventFactory, EventService } from "@/app/lib/events";
import { audit } from "@/app/lib/audit";

export interface ApprovalWorkflowTemplate {
  type: "payment_only" | "profile_payment" | "full_3_dimension" | "no_approval";
  dimensions: string[];
  required_documents: string[];
  description: string;
}

export interface FormApprovalContext {
  form_key: string;
  registration_id: string;
  current_status: string;
  dimension_status: Record<string, string>;
  approval_workflow: ApprovalWorkflowTemplate;
  registration_data: any;
}

export interface ApprovalResult {
  success: boolean;
  new_status: string;
  new_dimension_status: Record<string, string>;
  can_approve: boolean;
  missing_requirements: string[];
  message: string;
}

export class FormApprovalService {
  private supabase: any;

  constructor() {
    this.supabase = null; // Will be initialized when needed
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  /**
   * Get approval workflow template for a form
   */
  async getApprovalWorkflow(formKey: string): Promise<ApprovalWorkflowTemplate | null> {
    try {
      const supabase = await this.getSupabase();
      const { data: formType, error } = await supabase
        .from("form_types")
        .select("config")
        .eq("form_key", formKey)
        .eq("is_active", true)
        .single();

      if (error || !formType) {
        return null;
      }

      const approvalWorkflow = formType.config?.approval_workflow;
      if (!approvalWorkflow) {
        return null;
      }

      return this.getWorkflowTemplate(approvalWorkflow);
    } catch (error) {
      console.error("Error getting approval workflow:", error);
      return null;
    }
  }

  /**
   * Get workflow template by type
   */
  private getWorkflowTemplate(type: string): ApprovalWorkflowTemplate {
    const templates: Record<string, ApprovalWorkflowTemplate> = {
      payment_only: {
        type: "payment_only",
        dimensions: ["payment"],
        required_documents: ["payment_slip"],
        description: "Payment verification only",
      },
      profile_payment: {
        type: "profile_payment",
        dimensions: ["profile", "payment"],
        required_documents: ["profile_image", "payment_slip"],
        description: "Profile and payment verification",
      },
      full_3_dimension: {
        type: "full_3_dimension",
        dimensions: ["profile", "payment", "tcc"],
        required_documents: ["profile_image", "payment_slip", "chamber_card"],
        description: "Full 3-dimension verification (Profile, Payment, TCC)",
      },
      no_approval: {
        type: "no_approval",
        dimensions: [],
        required_documents: [],
        description: "No approval required - auto-approved",
      },
    };

    return templates[type] || templates.full_3_dimension;
  }

  /**
   * Get approval context for a registration
   */
  async getApprovalContext(
    formKey: string,
    registrationId: string
  ): Promise<FormApprovalContext | null> {
    try {
      const supabase = await this.getSupabase();
      
      // Get form registration
      const { data: registration, error: regError } = await supabase
        .from("form_registrations")
        .select("*")
        .eq("id", registrationId)
        .eq("form_key", formKey)
        .single();

      if (regError || !registration) {
        return null;
      }

      // Get form type and approval workflow
      const { data: formType, error: formError } = await supabase
        .from("form_types")
        .select("config")
        .eq("form_key", formKey)
        .single();

      if (formError || !formType) {
        return null;
      }

      const approvalWorkflow = this.getWorkflowTemplate(
        formType.config?.approval_workflow || "full_3_dimension"
      );

      return {
        form_key: formKey,
        registration_id: registrationId,
        current_status: registration.status,
        dimension_status: registration.dimension_status || {},
        approval_workflow: approvalWorkflow,
        registration_data: registration,
      };
    } catch (error) {
      console.error("Error getting approval context:", error);
      return null;
    }
  }

  /**
   * Check if registration can be approved
   */
  async canApprove(
    formKey: string,
    registrationId: string
  ): Promise<ApprovalResult> {
    try {
      const context = await this.getApprovalContext(formKey, registrationId);
      if (!context) {
        return {
          success: false,
          new_status: context?.current_status || "unknown",
          new_dimension_status: context?.dimension_status || {},
          can_approve: false,
          missing_requirements: ["Registration not found"],
          message: "Registration not found",
        };
      }

      const { approval_workflow, current_status, dimension_status } = context;

      // Check if already approved
      if (current_status === "approved") {
        return {
          success: true,
          new_status: "approved",
          new_dimension_status: dimension_status,
          can_approve: false,
          missing_requirements: [],
          message: "Registration is already approved",
        };
      }

      // Check if no approval required
      if (approval_workflow.type === "no_approval") {
        return {
          success: true,
          new_status: "approved",
          new_dimension_status: dimension_status,
          can_approve: true,
          missing_requirements: [],
          message: "No approval required - can be auto-approved",
        };
      }

      // Check required dimensions
      const missingRequirements: string[] = [];
      const newDimensionStatus = { ...dimension_status };

      for (const dimension of approval_workflow.dimensions) {
        const currentStatus = dimension_status[dimension];
        if (currentStatus !== "submitted") {
          missingRequirements.push(`${dimension} verification required`);
          newDimensionStatus[dimension] = "pending";
        }
      }

      const canApprove = missingRequirements.length === 0;

      return {
        success: true,
        new_status: canApprove ? "approved" : current_status,
        new_dimension_status: newDimensionStatus,
        can_approve: canApprove,
        missing_requirements: missingRequirements,
        message: canApprove
          ? "All requirements met - can be approved"
          : `Missing requirements: ${missingRequirements.join(", ")}`,
      };
    } catch (error) {
      console.error("Error checking approval eligibility:", error);
      return {
        success: false,
        new_status: "unknown",
        new_dimension_status: {},
        can_approve: false,
        missing_requirements: ["System error"],
        message: "Error checking approval eligibility",
      };
    }
  }

  /**
   * Approve a registration
   */
  async approveRegistration(
    formKey: string,
    registrationId: string,
    approverId: string,
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const supabase = await this.getSupabase();

      // Check if can approve
      const approvalCheck = await this.canApprove(formKey, registrationId);
      if (!approvalCheck.can_approve) {
        return {
          success: false,
          message: approvalCheck.message,
        };
      }

      // Update registration status
      const { error: updateError } = await supabase
        .from("form_registrations")
        .update({
          status: "approved",
          dimension_status: approvalCheck.new_dimension_status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", registrationId)
        .eq("form_key", formKey);

      if (updateError) {
        console.error("Error updating registration:", updateError);
        return {
          success: false,
          message: "Failed to update registration status",
        };
      }

      // Emit approval event
      await EventService.emit(
        EventFactory.createAdminApproved({
          applicationId: registrationId,
          actorId: approverId,
          correlationId: crypto.randomUUID(),
          meta: {
            form_key: formKey,
            approval_notes: notes,
            approval_type: "form_registration",
          },
        })
      );

      // Log audit event
      await audit.logEvent({
        correlationId: crypto.randomUUID(),
        eventType: "form_registration_approved",
        entityId: registrationId,
        meta: {
          form_key: formKey,
          approver_id: approverId,
          approval_notes: notes,
        },
      });

      return {
        success: true,
        message: "Registration approved successfully",
      };
    } catch (error) {
      console.error("Error approving registration:", error);
      return {
        success: false,
        message: "Error approving registration",
      };
    }
  }

  /**
   * Reject a registration
   */
  async rejectRegistration(
    formKey: string,
    registrationId: string,
    approverId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const supabase = await this.getSupabase();

      // Update registration status
      const { error: updateError } = await supabase
        .from("form_registrations")
        .update({
          status: "rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", registrationId)
        .eq("form_key", formKey);

      if (updateError) {
        console.error("Error updating registration:", updateError);
        return {
          success: false,
          message: "Failed to update registration status",
        };
      }

      // Emit rejection event
      await EventService.emit(
        EventFactory.createAdminRejected({
          applicationId: registrationId,
          actorId: approverId,
          correlationId: crypto.randomUUID(),
          meta: {
            form_key: formKey,
            rejection_reason: reason,
            rejection_type: "form_registration",
          },
        })
      );

      // Log audit event
      await audit.logEvent({
        correlationId: crypto.randomUUID(),
        eventType: "form_registration_rejected",
        entityId: registrationId,
        meta: {
          form_key: formKey,
          approver_id: approverId,
          rejection_reason: reason,
        },
      });

      return {
        success: true,
        message: "Registration rejected successfully",
      };
    } catch (error) {
      console.error("Error rejecting registration:", error);
      return {
        success: false,
        message: "Error rejecting registration",
      };
    }
  }

  /**
   * Mark a dimension as passed
   */
  async markDimensionPass(
    formKey: string,
    registrationId: string,
    dimension: string,
    approverId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const supabase = await this.getSupabase();

      // Get current dimension status
      const { data: registration, error: fetchError } = await supabase
        .from("form_registrations")
        .select("dimension_status")
        .eq("id", registrationId)
        .eq("form_key", formKey)
        .single();

      if (fetchError || !registration) {
        return {
          success: false,
          message: "Registration not found",
        };
      }

      const currentDimensionStatus = registration.dimension_status || {};
      const newDimensionStatus = {
        ...currentDimensionStatus,
        [dimension]: "submitted",
      };

      // Update dimension status
      const { error: updateError } = await supabase
        .from("form_registrations")
        .update({
          dimension_status: newDimensionStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", registrationId)
        .eq("form_key", formKey);

      if (updateError) {
        console.error("Error updating dimension status:", updateError);
        return {
          success: false,
          message: "Failed to update dimension status",
        };
      }

      // Log audit event
      await audit.logEvent({
        correlationId: crypto.randomUUID(),
        eventType: "form_dimension_passed",
        entityId: registrationId,
        meta: {
          form_key: formKey,
          dimension,
          approver_id: approverId,
        },
      });

      return {
        success: true,
        message: `${dimension} dimension marked as passed`,
      };
    } catch (error) {
      console.error("Error marking dimension pass:", error);
      return {
        success: false,
        message: "Error marking dimension pass",
      };
    }
  }

  /**
   * Get approval statistics for a form
   */
  async getApprovalStats(formKey: string): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    by_dimension: Record<string, { passed: number; pending: number }>;
  }> {
    try {
      const supabase = await this.getSupabase();

      // Get basic counts
      const { data: registrations, error } = await supabase
        .from("form_registrations")
        .select("status, dimension_status")
        .eq("form_key", formKey)
        .eq("is_active", true);

      if (error) {
        console.error("Error fetching approval stats:", error);
        return {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          by_dimension: {},
        };
      }

      const stats = {
        total: registrations.length,
        pending: 0,
        approved: 0,
        rejected: 0,
        by_dimension: {} as Record<string, { passed: number; pending: number }>,
      };

      // Count by status
      registrations.forEach((reg) => {
        switch (reg.status) {
          case "pending":
          case "waiting_for_review":
            stats.pending++;
            break;
          case "approved":
            stats.approved++;
            break;
          case "rejected":
            stats.rejected++;
            break;
        }

        // Count by dimension
        const dimensionStatus = reg.dimension_status || {};
        Object.entries(dimensionStatus).forEach(([dimension, status]) => {
          if (!stats.by_dimension[dimension]) {
            stats.by_dimension[dimension] = { passed: 0, pending: 0 };
          }
          if (status === "submitted") {
            stats.by_dimension[dimension].passed++;
          } else {
            stats.by_dimension[dimension].pending++;
          }
        });
      });

      return stats;
    } catch (error) {
      console.error("Error getting approval stats:", error);
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        by_dimension: {},
      };
    }
  }
}

// Export singleton instance
export const formApprovalService = new FormApprovalService();
