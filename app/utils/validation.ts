import { ValidationError } from "../types";

export const validateEmail = (email: string): ValidationError | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    return { field: "email", message: "Email is required" };
  }
  if (!emailRegex.test(email)) {
    return { field: "email", message: "Please enter a valid email address" };
  }
  return null;
};

export const validateRequired = (
  value: string,
  fieldName: string,
): ValidationError | null => {
  if (!value || value.trim().length === 0) {
    return {
      field: fieldName,
      message: `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`,
    };
  }
  return null;
};

export const validatePhone = (phone: string): ValidationError | null => {
  if (!phone) return null; // Phone is optional
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  if (!phoneRegex.test(phone.replace(/\s/g, ""))) {
    return { field: "phone", message: "Please enter a valid phone number" };
  }
  return null;
};

export const validateDateOfBirth = (
  dateOfBirth: string,
): ValidationError | null => {
  if (!dateOfBirth) return null; // Date of birth is optional
  const date = new Date(dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - date.getFullYear();

  if (isNaN(date.getTime())) {
    return { field: "dateOfBirth", message: "Please enter a valid date" };
  }
  if (age < 18 || age > 100) {
    return {
      field: "dateOfBirth",
      message: "Age must be between 18 and 100 years",
    };
  }
  return null;
};

export const validateRegistrationForm = (formData: any): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Required fields
  const requiredFields = ["email", "firstName", "lastName"];
  requiredFields.forEach((field) => {
    const error = validateRequired(formData[field], field);
    if (error) errors.push(error);
  });

  // Email validation
  const emailError = validateEmail(formData.email);
  if (emailError) errors.push(emailError);

  // Phone validation
  const phoneError = validatePhone(formData.phone);
  if (phoneError) errors.push(phoneError);

  // Date of birth validation
  const dobError = validateDateOfBirth(formData.dateOfBirth);
  if (dobError) errors.push(dobError);

  return errors;
};

export const formatValidationErrors = (
  errors: ValidationError[],
): Record<string, string> => {
  return errors.reduce(
    (acc, error) => {
      acc[error.field] = error.message;
      return acc;
    },
    {} as Record<string, string>,
  );
};
