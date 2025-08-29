"use client";

import { useCallback } from "react";

type ToastFn = (title: string, description?: string) => void;

function show(
  kind: "success" | "error" | "warning",
  title: string,
  description?: string,
) {
  // Minimal, non-blocking toast; replace with your UI lib if present
  // Avoid logging PII; only display user-facing text
  const evt = new CustomEvent("app:toast", {
    detail: { kind, title, description },
  });
  window.dispatchEvent(evt);
}

export function useToastHelpers() {
  const success: ToastFn = useCallback((title, description) => {
    show("success", title, description);
  }, []);

  const error: ToastFn = useCallback((title, description) => {
    show("error", title, description);
  }, []);

  const warning: ToastFn = useCallback((title, description) => {
    show("warning", title, description);
  }, []);

  return { success, error, warning };
}
