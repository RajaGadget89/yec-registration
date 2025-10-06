import { ParsedRecord } from "./csvParserService";
import { TransformedRecord } from "./dataTransformerService";
import { JsonConfigurationTransformer } from "./jsonConfigurationTransformer";

export interface ConfigurationTransformationResult {
  success: boolean;
  transformedRecords: TransformedRecord[];
  statistics: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    transformationErrors: number;
  };
  errors: string[];
}

/**
 * Adapter around JsonConfigurationTransformer to fit the import pipeline contracts
 */
export class ConfigurationDrivenTransformer {
  private transformer: JsonConfigurationTransformer;

  /**
   * @param configKey Optional key or identifier; kept for backward compat but ignored because
   *                  JsonConfigurationTransformer now reads from Supabase Storage by default.
   */
  constructor(configKey?: string) {
    // We ignore configKey for now; storage bucket/key are taken from envs
    this.transformer = new JsonConfigurationTransformer();
  }

  async initialize(): Promise<void> {
    await this.transformer.loadConfiguration();
  }

  async transformRecords(
    parsedRecords: ParsedRecord[],
  ): Promise<ConfigurationTransformationResult> {
    const transformedRecords: TransformedRecord[] = [];
    let validRecords = 0;
    let invalidRecords = 0;
    let transformationErrors = 0;
    const errors: string[] = [];

    for (const rec of parsedRecords) {
      try {
        const result = this.transformer.transformRow(rec.data);
        if (result.success) {
          validRecords++;
        } else {
          invalidRecords++;
          errors.push(...(result.errors || []));
        }

        const transformed: TransformedRecord = {
          originalData: rec.data,
          transformedData: result.transformedData as any,
          validation: {
            isValid: result.success,
            errors: result.errors || [],
            warnings: result.warnings || [],
          },
          metadata: {
            rowNumber: rec.rowNumber,
            originalHeaders: Object.keys(rec.data),
            transformationTimestamp: new Date().toISOString(),
          },
        };

        transformedRecords.push(transformed);
      } catch (err: any) {
        transformationErrors++;
        invalidRecords++;
        const message = err?.message || "Unknown transformation error";
        errors.push(message);
      }
    }

    return {
      success: errors.length === 0,
      transformedRecords,
      statistics: {
        totalRecords: parsedRecords.length,
        validRecords,
        invalidRecords,
        transformationErrors,
      },
      errors,
    };
  }
}
