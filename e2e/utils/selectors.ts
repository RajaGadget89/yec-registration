/**
 * Centralized selectors for E2E tests
 * All data-testid attributes should be defined here for consistency
 */

// Registration list selectors
export const SELECTORS = {
  // Registration rows
  regRow: "reg-row",
  regOpen: "reg-open",
  
  // Drawer
  drawerRoot: "drawer-root",
  
  // Status chips
  chipPayment: "chip-payment",
  chipProfile: "chip-profile", 
  chipTcc: "chip-tcc",
  
  // Action buttons (in drawer and list)
  btnRequestPayment: "btn-request-payment",
  btnPassPayment: "btn-pass-payment",
  btnRequestProfile: "btn-request-profile",
  btnPassProfile: "btn-pass-profile",
  btnRequestTcc: "btn-request-tcc",
  btnPassTcc: "btn-pass-tcc",
  
  // Global actions
  btnApprove: "btn-approve",
  
  // Request update modal
  modalRequest: "modal-request",
  inputNotes: "input-notes",
  btnSubmitRequest: "btn-submit-request",
  
  // Deep-link update page
  updateRoot: "update-root",
  filePayment: "file-payment",
  fileProfile: "file-profile",
  fileTcc: "file-tcc",
  btnUpdateSubmit: "btn-update-submit",
  updateInvalid: "update-invalid",
  
  // Email outbox
  outboxRow: "outbox-row",
  outboxBody: "outbox-body",
  outboxPage: "outbox-page",
} as const;

/**
 * Helper function to get selector by key
 * @param key - Selector key
 * @returns data-testid attribute value
 */
export function getSelector(key: keyof typeof SELECTORS): string {
  return SELECTORS[key];
}

/**
 * Helper function to create data-testid attribute
 * @param key - Selector key
 * @returns data-testid attribute object
 */
export function getTestId(key: keyof typeof SELECTORS): { "data-testid": string } {
  return { "data-testid": SELECTORS[key] };
}

/**
 * Helper function to create selector string for Playwright
 * @param key - Selector key
 * @returns Playwright selector string
 */
export function getSelectorString(key: keyof typeof SELECTORS): string {
  return `[data-testid="${SELECTORS[key]}"]`;
}
