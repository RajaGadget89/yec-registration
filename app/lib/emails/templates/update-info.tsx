import React from "react";
import { emailTheme } from "../theme";
import { EmailTemplateProps } from "../registry";
import { getEmailFromAddress } from "../../config";

export const UpdateInfoTemplate: React.FC<EmailTemplateProps> = ({
  applicantName = "ผู้สมัคร",
  trackingCode,
  ctaUrl,
  notes,
  supportEmail: _supportEmail,
  brandTokens,
  dimension,
}) => {
  // Use centralized email address if not provided
  const supportEmail = _supportEmail || getEmailFromAddress();
  void _supportEmail; // used to satisfy lint without changing config
  void dimension; // used to satisfy lint without changing config
  const { colors, spacing, button } = emailTheme;

  // Use brand colors if provided, otherwise use default theme
  const primaryColor = brandTokens?.primaryColor || colors.primary;
  const secondaryColor = brandTokens?.secondaryColor || colors.accent;

  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      {/* Thai Content */}
      <div style={{ marginBottom: spacing.xl }}>
        <h2
          style={{
            color: primaryColor,
            fontSize: "24px",
            marginBottom: spacing.md,
            textAlign: "center" as const,
          }}
        >
          ต้องการข้อมูลเพิ่มเติม
        </h2>

        <p
          style={{
            fontSize: "16px",
            lineHeight: "1.6",
            marginBottom: spacing.md,
          }}
        >
          สวัสดี {applicantName} ที่รัก
        </p>

        <p
          style={{
            fontSize: "16px",
            lineHeight: "1.6",
            marginBottom: spacing.lg,
          }}
        >
          ขอบคุณที่สมัครเข้าร่วมงาน YEC Day!
          เราได้ตรวจสอบข้อมูลการสมัครของคุณแล้ว
          และต้องการให้คุณอัปเดตข้อมูลส่วนบุคคล
        </p>

        <div
          style={{
            backgroundColor: colors.warning + "20",
            border: `1px solid ${colors.warning}`,
            borderRadius: "8px",
            padding: spacing.lg,
            marginBottom: spacing.lg,
          }}
        >
          <h3
            style={{
              color: colors.warning,
              fontSize: "18px",
              marginBottom: spacing.sm,
            }}
          >
            สิ่งที่ต้องทำ
          </h3>
          <p
            style={{
              fontSize: "16px",
              lineHeight: "1.6",
              marginBottom: spacing.md,
            }}
          >
            กรุณาอัปเดตข้อมูลส่วนบุคคลของคุณให้ถูกต้องและครบถ้วน
          </p>

          {notes && (
            <div
              style={{
                backgroundColor: colors.background,
                padding: spacing.md,
                borderRadius: "4px",
                marginBottom: spacing.md,
                borderLeft: `4px solid ${colors.warning}`,
              }}
            >
              <strong>หมายเหตุ:</strong> {notes}
            </div>
          )}

          <ul
            style={{
              margin: 0,
              paddingLeft: spacing.lg,
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            <li>ตรวจสอบให้แน่ใจว่าข้อมูลส่วนบุคคลถูกต้อง</li>
            <li>อัปเดตรูปภาพโปรไฟล์หากจำเป็น</li>
            <li>ตรวจสอบข้อมูลการติดต่อให้ถูกต้อง</li>
          </ul>
        </div>

        <div
          style={{
            backgroundColor: colors.gray[50],
            border: `2px solid ${secondaryColor}`,
            borderRadius: "8px",
            padding: spacing.lg,
            marginBottom: spacing.lg,
            textAlign: "center" as const,
          }}
        >
          <h3
            style={{
              color: primaryColor,
              fontSize: "18px",
              marginBottom: spacing.sm,
            }}
          >
            รหัสติดตามการสมัคร
          </h3>
          <div
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: secondaryColor,
              fontFamily: "monospace",
              letterSpacing: "2px",
            }}
          >
            {trackingCode}
          </div>
        </div>

        {ctaUrl && (
          <div
            style={{ textAlign: "center" as const, marginBottom: spacing.lg }}
          >
            <a
              href={ctaUrl}
              style={{
                ...button.primary,
                fontSize: "16px",
                padding: "16px 32px",
              }}
            >
              อัปเดตข้อมูลส่วนบุคคล
            </a>
          </div>
        )}

        <div
          style={{
            backgroundColor: colors.gray[100],
            padding: spacing.lg,
            borderRadius: "8px",
            fontSize: "14px",
            color: colors.gray[700],
          }}
        >
          <p style={{ margin: 0 }}>
            <strong>หากมีคำถาม:</strong> ติดต่อเราได้ที่ {supportEmail}
          </p>
          <p style={{ margin: "8px 0 0 0", fontSize: "12px" }}>
            ข้อมูลส่วนบุคคลของคุณจะถูกเก็บรักษาไว้ตามนโยบายการคุ้มครองข้อมูลส่วนบุคคล
            (PDPA)
          </p>
        </div>
      </div>

      {/* English Content */}
      <div
        style={{
          borderTop: `2px solid ${colors.gray[200]}`,
          paddingTop: spacing.lg,
        }}
      >
        <h2
          style={{
            color: primaryColor,
            fontSize: "24px",
            marginBottom: spacing.md,
            textAlign: "center" as const,
          }}
        >
          Additional Information Required
        </h2>

        <p
          style={{
            fontSize: "16px",
            lineHeight: "1.6",
            marginBottom: spacing.md,
          }}
        >
          Dear {applicantName},
        </p>

        <p
          style={{
            fontSize: "16px",
            lineHeight: "1.6",
            marginBottom: spacing.lg,
          }}
        >
          Thank you for registering for YEC Day! We have reviewed your
          registration and need you to update your profile information.
        </p>

        <div
          style={{
            backgroundColor: colors.warning + "20",
            border: `1px solid ${colors.warning}`,
            borderRadius: "8px",
            padding: spacing.lg,
            marginBottom: spacing.lg,
          }}
        >
          <h3
            style={{
              color: colors.warning,
              fontSize: "18px",
              marginBottom: spacing.sm,
            }}
          >
            Action Required
          </h3>
          <p
            style={{
              fontSize: "16px",
              lineHeight: "1.6",
              marginBottom: spacing.md,
            }}
          >
            Please update your personal information to be accurate and complete
          </p>

          {notes && (
            <div
              style={{
                backgroundColor: colors.background,
                padding: spacing.md,
                borderRadius: "4px",
                marginBottom: spacing.md,
                borderLeft: `4px solid ${colors.warning}`,
              }}
            >
              <strong>Notes:</strong> {notes}
            </div>
          )}

          <ul
            style={{
              margin: 0,
              paddingLeft: spacing.lg,
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            <li>Ensure your personal information is correct</li>
            <li>Update profile picture if necessary</li>
            <li>Verify contact information is accurate</li>
          </ul>
        </div>

        <div
          style={{
            backgroundColor: colors.gray[50],
            border: `2px solid ${secondaryColor}`,
            borderRadius: "8px",
            padding: spacing.lg,
            marginBottom: spacing.lg,
            textAlign: "center" as const,
          }}
        >
          <h3
            style={{
              color: primaryColor,
              fontSize: "18px",
              marginBottom: spacing.sm,
            }}
          >
            Registration Tracking Code
          </h3>
          <div
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: secondaryColor,
              fontFamily: "monospace",
              letterSpacing: "2px",
            }}
          >
            {trackingCode}
          </div>
        </div>

        {ctaUrl && (
          <div style={{ textAlign: "center" as const }}>
            <a
              href={ctaUrl}
              style={{
                ...button.primary,
                fontSize: "16px",
                padding: "16px 32px",
              }}
            >
              Update Profile Information
            </a>
          </div>
        )}

        <div
          style={{
            backgroundColor: colors.gray[100],
            padding: spacing.lg,
            borderRadius: "8px",
            fontSize: "14px",
            color: colors.gray[700],
            marginTop: spacing.lg,
          }}
        >
          <p style={{ margin: 0 }}>
            <strong>Questions?</strong> Contact us at {supportEmail}
          </p>
          <p style={{ margin: "8px 0 0 0", fontSize: "12px" }}>
            Your personal information will be protected according to our
            Personal Data Protection Policy (PDPA)
          </p>
        </div>
      </div>
    </div>
  );
};
