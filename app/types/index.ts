// Export database types
export type {
  Database,
  Registration,
  RegistrationInsert,
  RegistrationUpdate,
} from "./database";

// User and Registration Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: Date;
  occupation?: string;
  company?: string;
  experience?: string;
  interests?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RegistrationForm {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  occupation?: string;
  company?: string;
  experience?: string;
  interests?: string[];
}

export interface RegistrationResponse {
  success: boolean;
  message: string;
  userId?: string;
  errors?: Record<string, string>;
}

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

export interface AuthUser {
  id: string;
  email: string;
  role: "user" | "admin";
  firstName: string;
  lastName: string;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string>;
}

// Form Field Types
export interface FormField {
  id: string;
  label: string;
  type: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ value: string; label: string }>;
  extraFields?: FormField[];
  conditional?: {
    field: string;
    value: string;
  };
}

export interface FormFieldProps {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string | number;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  className?: string;
}

// Event Handler Types
export interface EventPayload {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

// Registration type for events (simplified version of database Registration)
export interface RegistrationEvent {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown; // Allow additional properties
}

// Audit Types
export interface AuditRow {
  id: string;
  timestamp: string;
  action: string;
  userId?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// WhoAmI Response Type
export interface WhoAmIResponse {
  user?: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
  };
  session?: {
    id: string;
    expiresAt: string;
  };
  isAuthenticated: boolean;
}

// Admin Types
export interface AdminDashboard {
  totalRegistrations: number;
  recentRegistrations: User[];
  pendingApprovals: number;
  statistics: {
    monthly: number;
    weekly: number;
    daily: number;
  };
}

// Form Validation Types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  status: "valid" | "invalid" | "partial" | null;
  message?: string;
  isValid: boolean;
}

export interface FormState {
  isValid: boolean;
  errors: ValidationError[];
  isSubmitting: boolean;
}
