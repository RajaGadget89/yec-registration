"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmText: string;
  confirmVariant?: "default" | "destructive";
  cancelText?: string;
  onConfirm: () => Promise<void>;
  children: React.ReactNode;
  plan?: {
    admin: { email: string };
    fk: Array<{ table: string; count: number }>;
    implicit: Array<{ table: string; count: number }>;
  };
}

export default function ConfirmDialog({
  title,
  description,
  confirmText,
  confirmVariant = "default",
  cancelText = "Cancel",
  onConfirm,
  children,
  plan,
}: ConfirmDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Auto open when a plan is provided from parent (e.g., after dry-run)
  useEffect(() => {
    if (plan) setIsOpen(true);
  }, [plan]);

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await onConfirm();
      setIsOpen(false);
    } catch (error) {
      console.error("Error in confirm action:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmButtonClasses = {
    default: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
    destructive: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)}>{children}</div>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsOpen(false)}
            />

            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20 sm:mx-0 sm:h-10 sm:w-10">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                    {title}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {description}
                    </p>

                    {/* Enhanced awareness message for production safety */}
                    <div className="mt-3 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
                      <div className="font-semibold mb-2">
                        ⚠️ CRITICAL ACTION WARNING
                      </div>
                      <div className="space-y-1">
                        <div>• This action cannot be undone</div>
                        <div>• The admin will immediately lose all access</div>
                        <div>• All associated permissions will be revoked</div>
                        <div>• Super admin accounts cannot be deleted</div>
                        <div>
                          • This action will be logged for audit purposes
                        </div>
                      </div>
                    </div>

                    {plan && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          This will affect the following tables:
                        </p>

                        {plan.fk.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              Foreign Key References:
                            </p>
                            {plan.fk.map((fk, index) => (
                              <div
                                key={index}
                                className="text-xs text-gray-600 dark:text-gray-400 ml-2"
                              >
                                • {fk.table}: {fk.count} row
                                {fk.count !== 1 ? "s" : ""}
                              </div>
                            ))}
                          </div>
                        )}

                        {plan.implicit.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              Implicit References:
                            </p>
                            {plan.implicit.map((imp, index) => (
                              <div
                                key={index}
                                className="text-xs text-gray-600 dark:text-gray-400 ml-2"
                              >
                                • {imp.table}: {imp.count} row
                                {imp.count !== 1 ? "s" : ""}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto ${confirmButtonClasses[confirmVariant]} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                  onClick={handleConfirm}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {confirmText}
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:w-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                >
                  {cancelText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
