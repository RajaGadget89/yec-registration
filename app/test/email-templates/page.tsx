"use client";

import { useState } from "react";

export default function EmailTemplateTestPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [testAll, setTestAll] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("tracking");

  const templates = [
    { value: "tracking", label: "New Registration (Tracking)" },
    { value: "update-payment", label: "Payment Update Request" },
    { value: "update-info", label: "Profile Update Request" },
    { value: "update-tcc", label: "TCC Update Request" },
    { value: "approval-badge", label: "Approval with Badge" },
    { value: "rejection", label: "Rejection Notice" },
  ];

  const sendTestEmail = async () => {
    setLoading(true);
    setResults([]);

    try {
      const response = await fetch("/api/test/email-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateType: testAll ? null : selectedTemplate,
          testAll,
        }),
      });

      const result = await response.json();
      setResults(result.results || [result]);

    } catch (error) {
      console.error("Error:", error);
      setResults([{
        template: "error",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            📧 Email Template Testing
          </h1>

          <div className="space-y-6">
            {/* Test Options */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-4">
                Test Configuration
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      checked={!testAll}
                      onChange={() => setTestAll(false)}
                      className="text-blue-600"
                    />
                    <span className="text-gray-700">Test Single Template</span>
                  </label>
                </div>

                {!testAll && (
                  <div className="ml-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Template:
                    </label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {templates.map((template) => (
                        <option key={template.value} value={template.value}>
                          {template.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      checked={testAll}
                      onChange={() => setTestAll(true)}
                      className="text-blue-600"
                    />
                    <span className="text-gray-700">Test All Templates</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Test Button */}
            <div className="text-center">
              <button
                onClick={sendTestEmail}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
              >
                {loading ? "Sending..." : testAll ? "Send All Test Emails" : "Send Test Email"}
              </button>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Test Results
                </h2>
                
                <div className="space-y-3">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        result.success
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">
                          {result.success ? "✅" : "❌"}
                        </span>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {result.template}
                          </h3>
                          {result.subject && (
                            <p className="text-sm text-gray-600">
                              Subject: {result.subject}
                            </p>
                          )}
                          {result.error && (
                            <p className="text-sm text-red-600">
                              Error: {result.error}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    📧 Check Your Email!
                  </h3>
                  <p className="text-blue-800">
                    Test emails have been sent to <strong>sharepoints911@gmail.com</strong>
                  </p>
                  <p className="text-blue-700 text-sm mt-1">
                    Please check your inbox (and spam folder) to see how the templates look.
                  </p>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-yellow-900 mb-4">
                📋 Instructions
              </h2>
              <ul className="space-y-2 text-yellow-800">
                <li>• Select a single template to test or test all templates at once</li>
                <li>• Click the send button to send test emails to sharepoints911@gmail.com</li>
                <li>• Check your email inbox to see how each template looks</li>
                <li>• All templates use the new master design with YEC branding and logo</li>
                <li>• Templates include realistic sample data for testing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
