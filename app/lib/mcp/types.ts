export type AccessLevel = "public" | "admin";

export interface MCPContentTypeConfig {
  typeKey: string;
  typeName: string;
  endpointPath: string;
  isEnabled: boolean;
  accessLevel: AccessLevel;
  sourceTable?: string;
}

export interface ExposureRule {
  contentTypeId: string;
  contentId: string;
  isExposed: boolean;
  exposureMetadata?: Record<string, unknown>;
}

export interface MCPRequestContext {
  apiKeyType: AccessLevel;
  correlationId: string;
}
