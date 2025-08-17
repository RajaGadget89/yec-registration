import React from "react";
import { emailTheme } from "../theme";
import { EmailTemplateProps } from "../registry";
import { getEmailFromAddress } from "../../config";

export const TrackingTemplate: React.FC<EmailTemplateProps> = ({
  applicantName = "ผู้สมัคร",
  trackingCode,
  supportEmail: _supportEmail,
  brandTokens,
}) => {
  // Use centralized email address if not provided
  const supportEmail = _supportEmail || getEmailFromAddress();
  const { colors } = emailTheme;

  // Use brand colors if provided, otherwise use default theme
  const primaryColor = brandTokens?.primaryColor || colors.primary;
  const secondaryColor = brandTokens?.secondaryColor || colors.accent;

  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      {/* Compact Welcome Section */}
      <div style={{ marginBottom: "20px" }}>
        <h2
          style={{
            color: primaryColor,
            fontSize: "20px",
            marginBottom: "12px",
            textAlign: "center" as const,
          }}
        >
          ยินดีต้อนรับสู่ YEC Day! | Welcome to YEC Day!
        </h2>

        <p
          style={{
            fontSize: "14px",
            lineHeight: "1.4",
            marginBottom: "8px",
            color: colors.gray[700],
          }}
        >
          สวัสดี {applicantName} ที่รัก | Dear {applicantName},
        </p>

        <p
          style={{
            fontSize: "14px",
            lineHeight: "1.4",
            marginBottom: "16px",
            color: colors.gray[700],
          }}
        >
          ขอบคุณที่สมัครเข้าร่วมงาน YEC Day! เราได้รับคำขอลงทะเบียนของคุณแล้ว
          และกำลังดำเนินการตรวจสอบข้อมูล | Thank you for registering for YEC
          Day! We have received your registration request and are processing
          your information.
        </p>
      </div>

      {/* Tracking Code Section - Compact */}
      <div
        style={{
          backgroundColor: colors.gray[50],
          border: `2px solid ${secondaryColor}`,
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "16px",
          textAlign: "center" as const,
        }}
      >
        <h3
          style={{
            color: primaryColor,
            fontSize: "16px",
            marginBottom: "8px",
          }}
        >
          รหัสติดตามการสมัคร | Registration Tracking Code
        </h3>
        <div
          style={{
            fontSize: "20px",
            fontWeight: "bold",
            color: secondaryColor,
            fontFamily: "monospace",
            letterSpacing: "1px",
            marginBottom: "8px",
          }}
        >
          {trackingCode}
        </div>
        <p
          style={{
            fontSize: "12px",
            color: colors.gray[600],
            margin: 0,
          }}
        >
          เก็บรหัสนี้ไว้เพื่อติดตามสถานะการสมัครของคุณ | Keep this code to track
          your registration status
        </p>
      </div>

      {/* Next Steps Section - Compact */}
      <div
        style={{
          backgroundColor: colors.highlight + "15",
          border: `1px solid ${colors.highlight}`,
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "16px",
        }}
      >
        <h3
          style={{
            color: colors.highlight,
            fontSize: "16px",
            marginBottom: "8px",
          }}
        >
          ขั้นตอนต่อไป | Next Steps
        </h3>
        <ul
          style={{
            margin: 0,
            paddingLeft: "20px",
            fontSize: "13px",
            lineHeight: "1.4",
            color: colors.gray[700],
          }}
        >
          <li style={{ marginBottom: "4px" }}>
            ทีมงานจะตรวจสอบข้อมูลการสมัครของคุณ | Our team will review your
            registration information
          </li>
          <li style={{ marginBottom: "4px" }}>
            คุณจะได้รับการแจ้งเตือนเมื่อการตรวจสอบเสร็จสิ้น | You will be
            notified once the review is complete
          </li>
          <li style={{ marginBottom: "0" }}>
            หากต้องการข้อมูลเพิ่มเติม เราจะติดต่อคุณ | If additional information
            is needed, we will contact you
          </li>
        </ul>
      </div>

      {/* Contact Section - Compact */}
      <div
        style={{
          backgroundColor: colors.gray[100],
          padding: "12px",
          borderRadius: "6px",
          fontSize: "12px",
          color: colors.gray[700],
          textAlign: "center" as const,
        }}
      >
        <p style={{ margin: 0 }}>
          <strong>หากมีคำถาม | Questions?</strong> ติดต่อเราได้ที่ | Contact us
          at {supportEmail}
        </p>
      </div>
    </div>
  );
};
