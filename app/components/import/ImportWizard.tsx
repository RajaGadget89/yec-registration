"use client";

import { useState, useCallback, useEffect } from "react";
import { FileUploadStep } from "./steps/FileUploadStep";
import { DataMappingStep } from "./steps/DataMappingStep";
import { PreviewStep } from "./steps/PreviewStep";
import { DryRunStep } from "./steps/DryRunStep";
import { ExecutionStep } from "./steps/ExecutionStep";
import { ResultsStep } from "./steps/ResultsStep";

export interface ImportSession {
  id: string;
  filename: string;
  status: "processing" | "completed" | "failed" | "rolled_back";
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  createdAt: string;
  completedAt?: string;
}

export interface ImportWizardProps {
  onSessionStart: (session: ImportSession) => void;
  onSessionComplete: () => void;
}

export function ImportWizard({
  onSessionStart,
  onSessionComplete,
}: ImportWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [mappedData, setMappedData] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [dryRunResults, setDryRunResults] = useState<any>(null);
  const [executionResults, setExecutionResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Ensure client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  const steps = [
    { id: 1, name: "File Upload", description: "Upload CSV or Excel file" },
    {
      id: 2,
      name: "Data Mapping",
      description: "Map columns to system fields",
    },
    { id: 3, name: "Preview", description: "Review and validate data" },
    { id: 4, name: "Dry Run", description: "Simulate import process" },
    { id: 5, name: "Execute", description: "Run the import" },
    { id: 6, name: "Results", description: "View import results" },
  ];

  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/import/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "File upload failed");
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      setUploadedFile(file);
      setCurrentStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDataMapping = useCallback(
    async (mappingConfig: any) => {
      setIsLoading(true);
      setError(null);

      try {
        // First, save the mapping configuration (correct endpoint)
        const mapResponse = await fetch("/api/admin/import/mapping/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            mappingConfig,
          }),
        });

        if (!mapResponse.ok) {
          // Avoid JSON parse error on empty body
          const text = await mapResponse.text();
          try {
            const errorData = text ? JSON.parse(text) : null;
            throw new Error(
              (errorData && errorData.message) ||
                `Data mapping failed (${mapResponse.status})`,
            );
          } catch (_) {
            throw new Error(`Data mapping failed (${mapResponse.status})`);
          }
        }

        // Then trigger validation
        const validateResponse = await fetch("/api/admin/import/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
          }),
        });

        if (!validateResponse.ok) {
          const errorData = await validateResponse.json();
          throw new Error(errorData.message || "Data validation failed");
        }

        const validateData = await validateResponse.json();
        console.log("=== ImportWizard handleDataMapping ===");
        console.log("Response data:", validateData);
        console.log(
          "mappedRecords from response:",
          validateData.mappedRecords?.length,
        );
        console.log("Sample mappedRecord:", validateData.mappedRecords?.[0]);
        setValidationResults(validateData);
        setMappedData(validateData.mappedRecords);
        setCurrentStep(3);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId],
  );

  const handlePreview = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/import/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Data validation failed");
      }

      const data = await response.json();
      console.log("=== ImportWizard handlePreview ===");
      console.log("Response data:", data);
      console.log("mappedRecords from response:", data.mappedRecords?.length);
      console.log("Sample mappedRecord:", data.mappedRecords?.[0]);
      setValidationResults(data);
      // Stay on step 3 (Preview) to show the data table
      // User can then proceed to step 4 (Dry Run) by clicking "Continue to Dry Run"
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const handleDryRun = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/import/dry-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          mappedData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Dry run failed");
      }

      const data = await response.json();
      setDryRunResults(data);
      setCurrentStep(5);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, mappedData]);

  const handleExecution = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/import/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionId!,
          dryRun: false,
          batchSize: 10,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Import execution failed");
      }

      const data = await response.json();
      setExecutionResults(data);
      setCurrentStep(6);

      // Notify parent component
      if (data.result && data.result.sessionId) {
        onSessionStart({
          id: data.result.sessionId,
          filename: uploadedFile?.name || "",
          status: "processing",
          totalRecords: data.result.totalRecords || 0,
          successfulRecords: data.result.successfulRecords || 0,
          failedRecords: data.result.failedRecords || 0,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, uploadedFile, onSessionStart]);

  const handleReset = useCallback(() => {
    setCurrentStep(1);
    setSessionId(null);
    setUploadedFile(null);
    setMappedData([]);
    setValidationResults(null);
    setDryRunResults(null);
    setExecutionResults(null);
    setError(null);
  }, []);

  const handleBackToMapping = useCallback(() => {
    setCurrentStep(2);
  }, []);

  const handleBack = useCallback(() => {
    setCurrentStep((prevStep) => Math.max(1, prevStep - 1));
  }, []);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <FileUploadStep
            onFileUpload={handleFileUpload}
            isLoading={isLoading}
            error={error}
          />
        );
      case 2:
        return (
          <DataMappingStep
            sessionId={sessionId}
            onMappingComplete={handleDataMapping}
            isLoading={isLoading}
            error={error}
          />
        );
      case 3:
        return (
          <PreviewStep
            sessionId={sessionId}
            mappedData={mappedData}
            validationResults={validationResults}
            onPreview={handlePreview}
            onNext={handleDryRun}
            onBack={handleBackToMapping}
            isLoading={isLoading}
            error={error}
          />
        );
      case 4:
        return (
          <DryRunStep
            sessionId={sessionId}
            dryRunResults={dryRunResults}
            onDryRun={handleDryRun}
            onNext={handleExecution}
            onBack={handleBack}
            isLoading={isLoading}
            error={error}
          />
        );
      case 5:
        return (
          <ExecutionStep
            sessionId={sessionId}
            dryRunResults={dryRunResults}
            onExecute={handleExecution}
            onBack={handleBack}
            isLoading={isLoading}
            error={error}
          />
        );
      case 6:
        return (
          <ResultsStep
            sessionId={sessionId}
            executionResults={executionResults}
            onReset={handleReset}
            onSessionComplete={onSessionComplete}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-center space-x-8">
            {steps.map((step, stepIdx) => (
              <li key={step.id} className="flex items-center">
                <div className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                      currentStep >= step.id
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-gray-300 text-gray-500"
                    }`}
                  >
                    {currentStep > step.id ? (
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <span className="text-sm font-medium">{step.id}</span>
                    )}
                  </div>
                  <div className="ml-4">
                    <p
                      className={`text-sm font-medium ${
                        currentStep >= step.id
                          ? "text-blue-600"
                          : "text-gray-500"
                      }`}
                    >
                      {step.name}
                    </p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                </div>
                {stepIdx < steps.length - 1 && (
                  <div className="ml-8 w-8 h-0.5 bg-gray-300" />
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Step Content */}
      <div className="bg-white">
        {isClient ? (
          renderStep()
        ) : (
          <div className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
