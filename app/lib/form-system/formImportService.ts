import { getSupabaseServerClient } from "../supabase/server";
import { EventFactory } from "../events/eventFactory";
import { EventService } from "../events/eventService";
import { audit } from "../audit";
import { formTrackingIdService } from "./formTrackingIdService";
import { formRegistrationService } from "./formRegistrationService";

export interface ImportJob {
  id: string;
  form_key: string;
  file_name: string;
  file_size: number;
  total_rows: number;
  processed_rows: number;
  successful_rows: number;
  failed_rows: number;
  status: "pending" | "processing" | "completed" | "failed";
  error_message?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ImportItem {
  id: string;
  import_job_id: string;
  row_number: number;
  data: Record<string, any>;
  status: "pending" | "success" | "failed";
  error_message?: string;
  registration_id?: string;
  created_at: string;
}

export interface ImportResult {
  success: boolean;
  job_id?: string;
  message: string;
  errors?: string[];
}

export interface ImportPreview {
  headers: string[];
  sample_rows: Record<string, any>[];
  total_rows: number;
  field_mapping: Record<string, string>;
}

export class FormImportService {
  private supabase: any;

  constructor() {
    this.supabase = null; // Will be initialized when needed
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await getSupabaseServerClient();
    }
    return this.supabase;
  }

  /**
   * Create a new import job
   */
  async createImportJob(
    formKey: string,
    fileName: string,
    fileSize: number,
    totalRows: number,
    createdBy: string,
  ): Promise<{ success: boolean; jobId?: string; message: string }> {
    try {
      const supabase = await this.getSupabase();

      const { data: job, error } = await supabase
        .from("form_import_jobs")
        .insert({
          form_key: formKey,
          file_name: fileName,
          file_size: fileSize,
          total_rows: totalRows,
          processed_rows: 0,
          successful_rows: 0,
          failed_rows: 0,
          status: "pending",
          created_by: createdBy,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating import job:", error);
        return {
          success: false,
          message: "Failed to create import job",
        };
      }

      // Log audit event
      await audit.logEvent({
        action: "form_import_job_created",
        resource: "form_import_jobs",
        resource_id: job.id,
        actor_id: "system",
        actor_role: "system",
        result: "success",
        correlation_id: crypto.randomUUID(),
        meta: {
          form_key: formKey,
          file_name: fileName,
          total_rows: totalRows,
          created_by: createdBy,
        },
      });

      return {
        success: true,
        jobId: job.id,
        message: "Import job created successfully",
      };
    } catch (error) {
      console.error("Error creating import job:", error);
      return {
        success: false,
        message: "Error creating import job",
      };
    }
  }

  /**
   * Add import items to a job
   */
  async addImportItems(
    jobId: string,
    items: Array<{
      row_number: number;
      data: Record<string, any>;
    }>,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const supabase = await this.getSupabase();

      const importItems = items.map((item) => ({
        import_job_id: jobId,
        row_number: item.row_number,
        data: item.data,
        status: "pending",
      }));

      const { error } = await supabase
        .from("form_import_items")
        .insert(importItems);

      if (error) {
        console.error("Error adding import items:", error);
        return {
          success: false,
          message: "Failed to add import items",
        };
      }

      return {
        success: true,
        message: "Import items added successfully",
      };
    } catch (error) {
      console.error("Error adding import items:", error);
      return {
        success: false,
        message: "Error adding import items",
      };
    }
  }

  /**
   * Process import job
   */
  async processImportJob(
    jobId: string,
    fieldMapping: Record<string, string>,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const supabase = await this.getSupabase();

      // Update job status to processing
      await this.supabase
        .from("form_import_jobs")
        .update({ status: "processing" })
        .eq("id", jobId);

      // Get job details
      const { data: job, error: jobError } = await supabase
        .from("form_import_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (jobError || !job) {
        return {
          success: false,
          message: "Import job not found",
        };
      }

      // Get pending items
      const { data: items, error: itemsError } = await supabase
        .from("form_import_items")
        .select("*")
        .eq("import_job_id", jobId)
        .eq("status", "pending")
        .order("row_number");

      if (itemsError) {
        console.error("Error fetching import items:", itemsError);
        return {
          success: false,
          message: "Failed to fetch import items",
        };
      }

      let successfulRows = 0;
      let failedRows = 0;

      // Process each item
      for (const item of items) {
        try {
          // Map data according to field mapping
          const mappedData = this.mapImportData(item.data, fieldMapping);

          // Generate tracking ID
          const trackingResult = await formTrackingIdService.generateTrackingId(
            job.form_key,
            mappedData,
          );

          if (!(trackingResult as any).success) {
            throw new Error(
              (trackingResult as any).error || "Failed to generate tracking ID",
            );
          }

          // Create registration
          const registrationData = {
            form_key: job.form_key,
            tracking_id: trackingResult.tracking_id,
            sequence_number: trackingResult.sequence_number,
            core_data: mappedData,
            extra_data: {},
            status: "pending",
            is_active: true,
          };

          const registration = await formRegistrationService.create(
            registrationData as any,
          );

          // Update item as successful
          await this.supabase
            .from("form_import_items")
            .update({
              status: "success",
              registration_id: registration.id,
            })
            .eq("id", item.id);

          successfulRows++;
        } catch (error) {
          console.error(`Error processing row ${item.row_number}:`, error);

          // Update item as failed
          await this.supabase
            .from("form_import_items")
            .update({
              status: "failed",
              error_message:
                error instanceof Error ? error.message : "Unknown error",
            })
            .eq("id", item.id);

          failedRows++;
        }
      }

      // Update job status
      const finalStatus = failedRows === 0 ? "completed" : "failed";
      await this.supabase
        .from("form_import_jobs")
        .update({
          status: finalStatus,
          processed_rows: items.length,
          successful_rows: successfulRows,
          failed_rows: failedRows,
        })
        .eq("id", jobId);

      // Emit import completed event
      await EventService.emit(
        EventFactory.createImportCompleted({
          jobId: jobId,
          formKey: job.form_key,
          correlationId: crypto.randomUUID(),
        }),
      );

      return {
        success: true,
        message: `Import completed: ${successfulRows} successful, ${failedRows} failed`,
      };
    } catch (error) {
      console.error("Error processing import job:", error);

      // Update job status to failed
      await this.supabase
        .from("form_import_jobs")
        .update({
          status: "failed",
          error_message:
            error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", jobId);

      return {
        success: false,
        message: "Error processing import job",
      };
    }
  }

  /**
   * Map import data according to field mapping
   */
  private mapImportData(
    data: Record<string, any>,
    fieldMapping: Record<string, string>,
  ): Record<string, any> {
    const mappedData: Record<string, any> = {};

    for (const [importField, formField] of Object.entries(fieldMapping)) {
      if (data[importField] !== undefined) {
        mappedData[formField] = data[importField];
      }
    }

    return mappedData;
  }

  /**
   * Get import job status
   */
  async getImportJobStatus(jobId: string): Promise<ImportJob | null> {
    try {
      const supabase = await this.getSupabase();

      const { data: job, error } = await supabase
        .from("form_import_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (error || !job) {
        return null;
      }

      return job;
    } catch (error) {
      console.error("Error getting import job status:", error);
      return null;
    }
  }

  /**
   * Get import job items
   */
  async getImportJobItems(
    jobId: string,
    status?: string,
  ): Promise<ImportItem[]> {
    try {
      const supabase = await this.getSupabase();

      let query = supabase
        .from("form_import_items")
        .select("*")
        .eq("import_job_id", jobId);

      if (status) {
        query = query.eq("status", status);
      }

      const { data: items, error } = await query.order("row_number");

      if (error) {
        console.error("Error getting import job items:", error);
        return [];
      }

      return items || [];
    } catch (error) {
      console.error("Error getting import job items:", error);
      return [];
    }
  }

  /**
   * Get all import jobs for a form
   */
  async getFormImportJobs(formKey: string): Promise<ImportJob[]> {
    try {
      const supabase = await this.getSupabase();

      const { data: jobs, error } = await supabase
        .from("form_import_jobs")
        .select("*")
        .eq("form_key", formKey)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error getting form import jobs:", error);
        return [];
      }

      return jobs || [];
    } catch (error) {
      console.error("Error getting form import jobs:", error);
      return [];
    }
  }

  /**
   * Delete import job
   */
  async deleteImportJob(
    jobId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const supabase = await this.getSupabase();

      // Delete import items first
      await this.supabase
        .from("form_import_items")
        .delete()
        .eq("import_job_id", jobId);

      // Delete import job
      const { error } = await supabase
        .from("form_import_jobs")
        .delete()
        .eq("id", jobId);

      if (error) {
        console.error("Error deleting import job:", error);
        return {
          success: false,
          message: "Failed to delete import job",
        };
      }

      return {
        success: true,
        message: "Import job deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting import job:", error);
      return {
        success: false,
        message: "Error deleting import job",
      };
    }
  }

  /**
   * Get import statistics for a form
   */
  async getImportStats(formKey: string): Promise<{
    total_jobs: number;
    completed_jobs: number;
    failed_jobs: number;
    total_imported: number;
    total_failed: number;
  }> {
    try {
      const supabase = await this.getSupabase();

      // Get job statistics
      const { data: jobs, error: jobsError } = await supabase
        .from("form_import_jobs")
        .select("status, successful_rows, failed_rows")
        .eq("form_key", formKey);

      if (jobsError) {
        console.error("Error getting import stats:", jobsError);
        return {
          total_jobs: 0,
          completed_jobs: 0,
          failed_jobs: 0,
          total_imported: 0,
          total_failed: 0,
        };
      }

      const stats = {
        total_jobs: jobs.length,
        completed_jobs: jobs.filter((j: any) => j.status === "completed")
          .length,
        failed_jobs: jobs.filter((j: any) => j.status === "failed").length,
        total_imported: jobs.reduce(
          (sum: any, j: any) => sum + (j.successful_rows || 0),
          0,
        ),
        total_failed: jobs.reduce(
          (sum: any, j: any) => sum + (j.failed_rows || 0),
          0,
        ),
      };

      return stats;
    } catch (error) {
      console.error("Error getting import stats:", error);
      return {
        total_jobs: 0,
        completed_jobs: 0,
        failed_jobs: 0,
        total_imported: 0,
        total_failed: 0,
      };
    }
  }
}

// Export singleton instance
export const formImportService = new FormImportService();
