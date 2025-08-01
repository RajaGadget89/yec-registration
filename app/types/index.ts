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
  role: 'user' | 'admin';
  firstName: string;
  lastName: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string>;
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

export interface FormState {
  isValid: boolean;
  errors: ValidationError[];
  isSubmitting: boolean;
} 