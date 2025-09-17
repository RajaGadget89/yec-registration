import React from "react";
import { emailTheme } from "../theme";
import { EmailTemplateProps } from "../registry";
import { getEmailFromAddress } from "../../config";

interface MasterEmailTemplateProps extends EmailTemplateProps {
  title: string;
  content: React.ReactNode;
  ctaButton?: {
    text: string;
    url: string;
    color?: "primary" | "secondary" | "success" | "warning";
  };
  showTrackingCode?: boolean;
  showNextSteps?: boolean;
  nextSteps?: React.ReactNode;
}

export const MasterEmailTemplate: React.FC<MasterEmailTemplateProps> = ({
  title,
  content,
  ctaButton,
  showTrackingCode = false,
  showNextSteps = false,
  nextSteps,
  applicantName = "ผู้สมัคร",
  trackingCode,
  supportEmail: _supportEmail,
  brandTokens,
}) => {
  // Use centralized email address if not provided
  const supportEmail = _supportEmail || getEmailFromAddress();
  const { colors, spacing: _spacing, button: _button } = emailTheme;

  // Use brand colors if provided, otherwise use default theme
  const primaryColor = brandTokens?.primaryColor || colors.primary;
  const secondaryColor = brandTokens?.secondaryColor || colors.accent;
  const highlightColor = colors.highlight;

  // Get base URL for logo
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://yecday.yecsongkhla.org";
  const logoUrl = `${baseUrl}/assets/logo-full.png`;

  // Button color mapping
  const getButtonStyle = (color: string = "primary") => {
    const buttonColors = {
      primary: primaryColor,
      secondary: secondaryColor,
      success: colors.success,
      warning: colors.warning,
    };

    return {
      backgroundColor:
        buttonColors[color as keyof typeof buttonColors] || primaryColor,
      color: "#ffffff",
      padding: "14px 28px",
      borderRadius: "8px",
      textDecoration: "none",
      display: "inline-block",
      fontWeight: "600",
      fontSize: "16px",
      textAlign: "center" as const,
    };
  };

  return (
    <div
      style={{
        fontFamily: "Arial, Helvetica, sans-serif",
        margin: 0,
        padding: 0,
      }}
    >
      {/* Email Container */}
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          backgroundColor: colors.background,
        }}
      >
        {/* Header with Logo */}
        <div
          style={{
            backgroundColor: primaryColor,
            padding: "24px",
            textAlign: "center" as const,
          }}
        >
          <img
            src={logoUrl}
            alt="YEC Day Logo"
            style={{
              maxWidth: "200px",
              height: "auto",
              marginBottom: "12px",
            }}
            onError={(e) => {
              // Fallback if logo fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = "block";
            }}
          />
          <div
            style={{
              display: "none",
              color: "#ffffff",
              fontSize: "24px",
              fontWeight: "bold",
              marginBottom: "8px",
            }}
          >
            YEC Day Logo
          </div>
          <div
            style={{
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: "500",
              opacity: 0.9,
            }}
          >
            Young Entrepreneurs Chamber
          </div>
        </div>

        {/* Main Content */}
        <div style={{ padding: "32px 24px" }}>
          {/* Title */}
          <h1
            style={{
              color: primaryColor,
              fontSize: "28px",
              fontWeight: "bold",
              marginBottom: "20px",
              textAlign: "center" as const,
              lineHeight: "1.3",
            }}
          >
            {title}
          </h1>

          {/* Greeting */}
          <p
            style={{
              fontSize: "16px",
              lineHeight: "1.6",
              marginBottom: "20px",
              color: colors.gray[700],
            }}
          >
            สวัสดี {applicantName} ที่รัก | Dear {applicantName},
          </p>

          {/* Main Content */}
          <div
            style={{
              fontSize: "16px",
              lineHeight: "1.6",
              marginBottom: "24px",
              color: colors.gray[700],
            }}
          >
            {content}
          </div>

          {/* Tracking Code Section */}
          {showTrackingCode && trackingCode && (
            <div
              style={{
                backgroundColor: colors.gray[50],
                border: `2px solid ${secondaryColor}`,
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "24px",
                textAlign: "center" as const,
              }}
            >
              <h3
                style={{
                  color: primaryColor,
                  fontSize: "18px",
                  fontWeight: "600",
                  marginBottom: "12px",
                }}
              >
                รหัสติดตามการสมัคร | Registration Tracking Code
              </h3>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: secondaryColor,
                  fontFamily: "monospace",
                  letterSpacing: "2px",
                  marginBottom: "8px",
                  backgroundColor: colors.background,
                  padding: "12px",
                  borderRadius: "8px",
                  border: `1px solid ${colors.gray[200]}`,
                }}
              >
                {trackingCode}
              </div>
              <p
                style={{
                  fontSize: "14px",
                  color: colors.gray[600],
                  margin: 0,
                }}
              >
                เก็บรหัสนี้ไว้เพื่อติดตามสถานะการสมัครของคุณ | Keep this code to
                track your registration status
              </p>
            </div>
          )}

          {/* CTA Button */}
          {ctaButton && (
            <div
              style={{
                textAlign: "center" as const,
                marginBottom: "32px",
              }}
            >
              <a href={ctaButton.url} style={getButtonStyle(ctaButton.color)}>
                {ctaButton.text}
              </a>
            </div>
          )}

          {/* Next Steps Section */}
          {showNextSteps && (
            <div
              style={{
                backgroundColor: highlightColor + "15",
                border: `1px solid ${highlightColor}`,
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "24px",
              }}
            >
              <h3
                style={{
                  color: highlightColor,
                  fontSize: "18px",
                  fontWeight: "600",
                  marginBottom: "12px",
                }}
              >
                ขั้นตอนต่อไป | Next Steps
              </h3>
              {nextSteps || (
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: "20px",
                    fontSize: "14px",
                    lineHeight: "1.6",
                    color: colors.gray[700],
                  }}
                >
                  <li style={{ marginBottom: "8px" }}>
                    ทีมงานจะตรวจสอบข้อมูลการสมัครของคุณ | Our team will review
                    your registration information
                  </li>
                  <li style={{ marginBottom: "8px" }}>
                    คุณจะได้รับการแจ้งเตือนเมื่อการตรวจสอบเสร็จสิ้น | You will
                    be notified once the review is complete
                  </li>
                  <li style={{ marginBottom: "0" }}>
                    หากต้องการข้อมูลเพิ่มเติม เราจะติดต่อคุณ | If additional
                    information is needed, we will contact you
                  </li>
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            backgroundColor: colors.gray[100],
            padding: "20px 24px",
            textAlign: "center" as const,
            borderTop: `1px solid ${colors.gray[200]}`,
          }}
        >
          <p
            style={{
              fontSize: "14px",
              color: colors.gray[600],
              margin: "0 0 8px 0",
            }}
          >
            <strong>หากมีคำถาม | Questions?</strong>
          </p>
          <p
            style={{
              fontSize: "14px",
              color: colors.gray[600],
              margin: 0,
            }}
          >
            ติดต่อเราได้ที่ | Contact us at{" "}
            <a
              href={`mailto:${supportEmail}`}
              style={{
                color: primaryColor,
                textDecoration: "none",
                fontWeight: "500",
              }}
            >
              {supportEmail}
            </a>
          </p>
          <div
            style={{
              marginTop: "16px",
              paddingTop: "16px",
              borderTop: `1px solid ${colors.gray[200]}`,
              fontSize: "12px",
              color: colors.gray[500],
            }}
          >
            <p style={{ margin: 0 }}>YEC Day - Young Entrepreneurs Chamber</p>
            <p style={{ margin: "4px 0 0 0" }}>
              This email was sent to {applicantName} regarding their YEC Day
              registration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
