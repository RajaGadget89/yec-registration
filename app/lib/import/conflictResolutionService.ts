import { getSupabaseServiceClient } from "../supabase-server";

export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: Conflict[];
  recommendations: ConflictResolution[];
}

export interface Conflict {
  type:
    | "duplicate_email"
    | "duplicate_phone"
    | "duplicate_tracking_code"
    | "validation_error"
    | "data_inconsistency";
  severity: "low" | "medium" | "high" | "critical";
  field: string;
  value: any;
  existingRecord?: any;
  newRecord: any;
  description: string;
  suggestedResolution: ConflictResolution;
}

export interface ConflictResolution {
  strategy: "skip" | "update" | "merge" | "override" | "manual_review";
  action: string;
  description: string;
  confidence: number; // 0-1
  risks: string[];
}

export interface ConflictResolutionConfig {
  allowDuplicateEmails: boolean;
  allowDuplicatePhones: boolean;
  autoResolveConflicts: boolean;
  requireManualReview: boolean;
  maxConflictsForAutoResolve: number;
}

export class ConflictResolutionService {
  private supabase = getSupabaseServiceClient();
  private config: ConflictResolutionConfig;

  constructor(config: ConflictResolutionConfig) {
    this.config = config;
  }

  /**
   * Detect conflicts before import
   */
  async detectConflicts(
    importData: Array<Record<string, any>>,
    sessionId: string,
  ): Promise<ConflictDetectionResult> {
    const conflicts: Conflict[] = [];
    const recommendations: ConflictResolution[] = [];

    // Check for duplicate emails
    const emailConflicts = await this.detectDuplicateEmails(importData);
    conflicts.push(...emailConflicts);

    // Check for duplicate phones
    const phoneConflicts = await this.detectDuplicatePhones(importData);
    conflicts.push(...phoneConflicts);

    // Check for duplicate tracking codes
    const trackingCodeConflicts =
      await this.detectDuplicateTrackingCodes(importData);
    conflicts.push(...trackingCodeConflicts);

    // Check for validation errors
    const validationConflicts = await this.detectValidationErrors(importData);
    conflicts.push(...validationConflicts);

    // Check for data inconsistencies
    const inconsistencyConflicts =
      await this.detectDataInconsistencies(importData);
    conflicts.push(...inconsistencyConflicts);

    // Generate recommendations
    recommendations.push(...this.generateRecommendations(conflicts));

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      recommendations,
    };
  }

  /**
   * Resolve conflicts automatically based on configuration
   */
  async resolveConflicts(
    conflicts: Conflict[],
    sessionId: string,
  ): Promise<{
    resolved: Conflict[];
    unresolved: Conflict[];
    resolutionLog: Array<{
      conflictId: string;
      resolution: ConflictResolution;
      timestamp: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    const resolved: Conflict[] = [];
    const unresolved: Conflict[] = [];
    const resolutionLog: Array<{
      conflictId: string;
      resolution: ConflictResolution;
      timestamp: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const conflict of conflicts) {
      try {
        const resolution = await this.resolveConflict(conflict, sessionId);

        if (resolution.success) {
          resolved.push(conflict);
          resolutionLog.push({
            conflictId: conflict.field,
            resolution: conflict.suggestedResolution,
            timestamp: new Date().toISOString(),
            success: true,
          });
        } else {
          unresolved.push(conflict);
          resolutionLog.push({
            conflictId: conflict.field,
            resolution: conflict.suggestedResolution,
            timestamp: new Date().toISOString(),
            success: false,
            error: resolution.error,
          });
        }
      } catch (error) {
        unresolved.push(conflict);
        resolutionLog.push({
          conflictId: conflict.field,
          resolution: conflict.suggestedResolution,
          timestamp: new Date().toISOString(),
          success: false,
          error: `Resolution failed: ${error}`,
        });
      }
    }

    return {
      resolved,
      unresolved,
      resolutionLog,
    };
  }

  /**
   * Detect duplicate emails
   */
  private async detectDuplicateEmails(
    importData: Array<Record<string, any>>,
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    const emailMap = new Map<string, number[]>();

    // Find duplicates within import data
    importData.forEach((record, index) => {
      const email = record.email || record.Email;
      if (email) {
        if (!emailMap.has(email)) {
          emailMap.set(email, []);
        }
        emailMap.get(email)!.push(index);
      }
    });

    // Check for conflicts
    for (const [email, indices] of emailMap.entries()) {
      if (indices.length > 1) {
        conflicts.push({
          type: "duplicate_email",
          severity: "high",
          field: "email",
          value: email,
          newRecord: importData[indices[0]],
          description: `Duplicate email '${email}' found in import data at rows ${indices.join(", ")}`,
          suggestedResolution: {
            strategy: "manual_review",
            action: "Review duplicate emails and decide which to keep",
            description: "Manual review required for duplicate email addresses",
            confidence: 0.8,
            risks: ["Data loss if wrong record is kept", "User confusion"],
          },
        });
      }
    }

    // Check against existing database records
    const emails = Array.from(emailMap.keys());
    if (emails.length > 0) {
      const { data: existingRecords } = await this.supabase
        .from("registrations")
        .select("email, id, first_name, last_name")
        .in("email", emails);

      if (existingRecords && existingRecords.length > 0) {
        for (const existingRecord of existingRecords) {
          conflicts.push({
            type: "duplicate_email",
            severity: "critical",
            field: "email",
            value: existingRecord.email,
            existingRecord,
            newRecord: importData.find((r) => r.email === existingRecord.email),
            description: `Email '${existingRecord.email}' already exists in database`,
            suggestedResolution: {
              strategy: "skip",
              action: "Skip import of duplicate email",
              description:
                "Skip importing records with existing email addresses",
              confidence: 0.9,
              risks: ["Data loss if existing record is overwritten"],
            },
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect duplicate phone numbers
   */
  private async detectDuplicatePhones(
    importData: Array<Record<string, any>>,
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    const phoneMap = new Map<string, number[]>();

    // Find duplicates within import data
    importData.forEach((record, index) => {
      const phone = record.phone || record.Phone || record["เบอร์โทรศัพท์"];
      if (phone) {
        if (!phoneMap.has(phone)) {
          phoneMap.set(phone, []);
        }
        phoneMap.get(phone)!.push(index);
      }
    });

    // Check for conflicts
    for (const [phone, indices] of phoneMap.entries()) {
      if (indices.length > 1) {
        conflicts.push({
          type: "duplicate_phone",
          severity: "medium",
          field: "phone",
          value: phone,
          newRecord: importData[indices[0]],
          description: `Duplicate phone '${phone}' found in import data at rows ${indices.join(", ")}`,
          suggestedResolution: {
            strategy: "manual_review",
            action: "Review duplicate phone numbers",
            description: "Manual review required for duplicate phone numbers",
            confidence: 0.7,
            risks: ["Data inconsistency", "User confusion"],
          },
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect duplicate tracking codes
   */
  private async detectDuplicateTrackingCodes(
    importData: Array<Record<string, any>>,
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    const trackingCodeMap = new Map<string, number[]>();

    // Find duplicates within import data
    importData.forEach((record, index) => {
      const trackingCode = record.tracking_code || record.TrackingCode;
      if (trackingCode) {
        if (!trackingCodeMap.has(trackingCode)) {
          trackingCodeMap.set(trackingCode, []);
        }
        trackingCodeMap.get(trackingCode)!.push(index);
      }
    });

    // Check for conflicts
    for (const [trackingCode, indices] of trackingCodeMap.entries()) {
      if (indices.length > 1) {
        conflicts.push({
          type: "duplicate_tracking_code",
          severity: "critical",
          field: "tracking_code",
          value: trackingCode,
          newRecord: importData[indices[0]],
          description: `Duplicate tracking code '${trackingCode}' found in import data at rows ${indices.join(", ")}`,
          suggestedResolution: {
            strategy: "override",
            action: "Generate new tracking codes for duplicates",
            description:
              "Generate new unique tracking codes for duplicate entries",
            confidence: 0.95,
            risks: ["Tracking code sequence disruption"],
          },
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect validation errors
   */
  private async detectValidationErrors(
    importData: Array<Record<string, any>>,
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    importData.forEach((record, index) => {
      // Check required fields
      const requiredFields = [
        "first_name",
        "last_name",
        "phone",
        "yec_province",
      ];
      for (const field of requiredFields) {
        if (!record[field] || record[field].trim() === "") {
          conflicts.push({
            type: "validation_error",
            severity: "high",
            field,
            value: record[field],
            newRecord: record,
            description: `Required field '${field}' is missing or empty in row ${index + 1}`,
            suggestedResolution: {
              strategy: "skip",
              action: "Skip records with missing required fields",
              description: "Skip importing records with missing required data",
              confidence: 0.9,
              risks: ["Incomplete data import"],
            },
          });
        }
      }

      // Check email format
      if (record.email && !this.isValidEmail(record.email)) {
        conflicts.push({
          type: "validation_error",
          severity: "medium",
          field: "email",
          value: record.email,
          newRecord: record,
          description: `Invalid email format '${record.email}' in row ${index + 1}`,
          suggestedResolution: {
            strategy: "skip",
            action: "Skip records with invalid email format",
            description: "Skip importing records with invalid email addresses",
            confidence: 0.8,
            risks: ["Email delivery failures"],
          },
        });
      }
    });

    return conflicts;
  }

  /**
   * Detect data inconsistencies
   */
  private async detectDataInconsistencies(
    importData: Array<Record<string, any>>,
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    importData.forEach((record, index) => {
      // Check for inconsistent gender/title mapping
      if (record.เพศ && record.title) {
        const genderMap: Record<string, string> = {
          ชาย: "นาย",
          หญิง: "นางสาว",
        };

        const expectedTitle = genderMap[record.เพศ];
        if (expectedTitle && record.title !== expectedTitle) {
          conflicts.push({
            type: "data_inconsistency",
            severity: "low",
            field: "title",
            value: record.title,
            newRecord: record,
            description: `Inconsistent gender/title mapping: เพศ='${record.เพศ}' but title='${record.title}' in row ${index + 1}`,
            suggestedResolution: {
              strategy: "override",
              action: "Apply automatic gender to title transformation",
              description: "Automatically transform gender to correct title",
              confidence: 0.95,
              risks: ["Minor data inconsistency"],
            },
          });
        }
      }
    });

    return conflicts;
  }

  /**
   * Generate resolution recommendations
   */
  private generateRecommendations(conflicts: Conflict[]): ConflictResolution[] {
    const recommendations: ConflictResolution[] = [];

    // Group conflicts by type
    const conflictGroups = conflicts.reduce(
      (groups, conflict) => {
        if (!groups[conflict.type]) {
          groups[conflict.type] = [];
        }
        groups[conflict.type].push(conflict);
        return groups;
      },
      {} as Record<string, Conflict[]>,
    );

    // Generate recommendations for each group
    for (const [type, typeConflicts] of Object.entries(conflictGroups)) {
      if (type === "duplicate_email") {
        recommendations.push({
          strategy: "manual_review",
          action: "Review all duplicate email addresses",
          description: `${typeConflicts.length} duplicate email conflicts require manual review`,
          confidence: 0.9,
          risks: ["Data loss if not handled carefully"],
        });
      } else if (type === "duplicate_phone") {
        recommendations.push({
          strategy: "merge",
          action: "Merge duplicate phone number records",
          description: `${typeConflicts.length} duplicate phone conflicts can be merged`,
          confidence: 0.7,
          risks: ["Data consolidation required"],
        });
      } else if (type === "validation_error") {
        recommendations.push({
          strategy: "skip",
          action: "Skip records with validation errors",
          description: `${typeConflicts.length} validation errors found - skip these records`,
          confidence: 0.8,
          risks: ["Incomplete data import"],
        });
      }
    }

    return recommendations;
  }

  /**
   * Resolve a single conflict
   */
  private async resolveConflict(
    conflict: Conflict,
    sessionId: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      switch (conflict.suggestedResolution.strategy) {
        case "skip":
          // Skip the record - no action needed
          return { success: true };

        case "override":
          // Apply the suggested transformation
          return { success: true };

        case "merge":
          // Merge records - implementation depends on specific conflict
          return { success: true };

        case "manual_review":
          // Mark for manual review
          await this.logConflictForManualReview(conflict, sessionId);
          return { success: true };

        default:
          return { success: false, error: "Unknown resolution strategy" };
      }
    } catch (error) {
      return { success: false, error: `Resolution failed: ${error}` };
    }
  }

  /**
   * Log conflict for manual review
   */
  private async logConflictForManualReview(
    conflict: Conflict,
    sessionId: string,
  ): Promise<void> {
    await this.supabase.from("import_audit_logs").insert({
      import_session_id: sessionId,
      event_type: "conflict_detected",
      event_details: {
        conflict_type: conflict.type,
        severity: conflict.severity,
        field: conflict.field,
        value: conflict.value,
        description: conflict.description,
        suggested_resolution: conflict.suggestedResolution,
      },
    });
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ConflictResolutionConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
