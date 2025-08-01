// Application Constants
export const APP_NAME = 'YEC Registration System';
export const APP_VERSION = '1.0.0';

// API Endpoints
export const API_ENDPOINTS = {
  REGISTER: '/api/register',
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  ADMIN_DASHBOARD: '/api/admin/dashboard',
  ADMIN_USERS: '/api/admin/users',
} as const;

// Form Fields
export const REGISTRATION_FIELDS = {
  EMAIL: 'email',
  FIRST_NAME: 'firstName',
  LAST_NAME: 'lastName',
  PHONE: 'phone',
  DATE_OF_BIRTH: 'dateOfBirth',
  OCCUPATION: 'occupation',
  COMPANY: 'company',
  EXPERIENCE: 'experience',
  INTERESTS: 'interests',
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  EMAIL_MAX_LENGTH: 255,
  NAME_MAX_LENGTH: 100,
  PHONE_MAX_LENGTH: 20,
  EXPERIENCE_MAX_LENGTH: 1000,
  MIN_AGE: 18,
  MAX_AGE: 100,
} as const;

// Interest Options
export const INTEREST_OPTIONS = [
  'Technology',
  'Finance',
  'Marketing',
  'Healthcare',
  'Education',
  'Real Estate',
  'E-commerce',
  'Consulting',
  'Manufacturing',
  'Other',
] as const;

// Experience Levels
export const EXPERIENCE_LEVELS = [
  'Student',
  'Entry Level (0-2 years)',
  'Mid Level (3-5 years)',
  'Senior Level (6-10 years)',
  'Executive Level (10+ years)',
] as const;

// User Roles
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

// Status Messages
export const STATUS_MESSAGES = {
  REGISTRATION_SUCCESS: 'Registration successful! Welcome to YEC.',
  REGISTRATION_ERROR: 'Registration failed. Please try again.',
  LOGIN_SUCCESS: 'Login successful!',
  LOGIN_ERROR: 'Invalid credentials. Please try again.',
  LOGOUT_SUCCESS: 'Logout successful!',
  VALIDATION_ERROR: 'Please check your input and try again.',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  INVALID_DATE: 'Please enter a valid date',
  AGE_RESTRICTION: 'You must be at least 18 years old',
  SERVER_ERROR: 'An error occurred. Please try again later',
  NETWORK_ERROR: 'Network error. Please check your connection',
} as const; 