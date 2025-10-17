"use client";

import { ApprovalWorkflowTemplate } from "../../../../types/form-system";

interface ApprovalWorkflowSelectorProps {
  value: ApprovalWorkflowTemplate;
  onChange: (workflow: ApprovalWorkflowTemplate) => void;
}

export default function ApprovalWorkflowSelector({
  value,
  onChange,
}: ApprovalWorkflowSelectorProps) {
  const workflows = [
    {
      value: "payment_only" as ApprovalWorkflowTemplate,
      title: "Payment Only",
      description: "Only payment slip verification required",
      dimensions: ["Payment Slip"],
    },
    {
      value: "payment_profile" as ApprovalWorkflowTemplate,
      title: "Payment + Profile",
      description: "Payment slip and profile verification required",
      dimensions: ["Payment Slip", "Profile Information"],
    },
    {
      value: "full_3d" as ApprovalWorkflowTemplate,
      title: "Full 3-Dimension",
      description: "Complete verification: Payment, Profile, and TCC",
      dimensions: ["Payment Slip", "Profile Information", "TCC Document"],
    },
  ];

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Approval Workflow Template
      </label>

      <div className="space-y-3">
        {workflows.map((workflow) => (
          <div
            key={workflow.value}
            className={`relative border rounded-lg p-4 cursor-pointer transition-colors ${
              value === workflow.value
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => onChange(workflow.value)}
          >
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="radio"
                  name="approval-workflow"
                  value={workflow.value}
                  checked={value === workflow.value}
                  onChange={() => onChange(workflow.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
              </div>
              <div className="ml-3">
                <div className="flex items-center">
                  <h4 className="text-sm font-medium text-gray-900">
                    {workflow.title}
                  </h4>
                  {value === workflow.value && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {workflow.description}
                </p>
                <div className="mt-2">
                  <div className="flex flex-wrap gap-1">
                    {workflow.dimensions.map((dimension) => (
                      <span
                        key={dimension}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {dimension}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h5 className="text-sm font-medium text-gray-900 mb-2">
          How it works:
        </h5>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>
            • <strong>Payment Only:</strong> Users submit payment slip, admin
            verifies payment, then approves
          </li>
          <li>
            • <strong>Payment + Profile:</strong> Users submit payment slip and
            profile info, admin verifies both, then approves
          </li>
          <li>
            • <strong>Full 3-Dimension:</strong> Users submit payment slip,
            profile info, and TCC document, admin verifies all three, then
            approves
          </li>
        </ul>
        <p className="text-sm text-gray-500 mt-2">
          The approval workflow determines which verification steps are required
          before a registration can be approved.
        </p>
      </div>
    </div>
  );
}
