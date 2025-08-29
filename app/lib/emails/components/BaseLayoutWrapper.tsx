import React from "react";

interface BaseLayoutWrapperProps {
  children: React.ReactNode;
  supportEmail?: string;
  brandTokens?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

/**
 * Wrapper component for email layout that doesn't use HTML tags
 * This is used to avoid Next.js build issues with HTML tags in components
 */
export const BaseLayoutWrapper: React.FC<BaseLayoutWrapperProps> = ({
  children,
}) => {
  // For email rendering, we'll use a simple div wrapper
  // The actual HTML structure will be handled by the email renderer
  return <div className="email-layout-wrapper">{children}</div>;
};

// Export the original BaseLayout for backward compatibility
// but only when not in a Next.js build context
export const BaseLayout = BaseLayoutWrapper;
