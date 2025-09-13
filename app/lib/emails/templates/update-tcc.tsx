import React from "react";
import { EmailTemplateProps } from "../registry";
import { MasterEmailTemplate } from "./MasterEmailTemplate";

export const UpdateTccTemplate: React.FC<EmailTemplateProps> = ({
  applicantName = "ผู้สมัคร",
  trackingCode,
  ctaUrl,
  notes,
  supportEmail,
  brandTokens,
}) => {
  return (
    <MasterEmailTemplate
      title="ต้องการข้อมูลเพิ่มเติม | Additional Information Required"
      content={
        <div>
          <p>
            ขอบคุณที่สมัครเข้าร่วมงาน YEC Day!
            เราได้ตรวจสอบข้อมูลการสมัครของคุณแล้ว และต้องการให้คุณอัปเดตรูปบัตร
            TCC | Thank you for registering for YEC Day! We have reviewed your
            registration and need you to update your TCC card.
          </p>

          {notes && (
            <div
              style={{
                backgroundColor: "#fef3c7",
                border: "1px solid #f59e0b",
                borderRadius: "8px",
                padding: "16px",
                margin: "16px 0",
              }}
            >
              <h4
                style={{
                  color: "#92400e",
                  fontSize: "16px",
                  fontWeight: "600",
                  margin: "0 0 8px 0",
                }}
              >
                หมายเหตุจากทีมงาน | Team Notes:
              </h4>
              <p
                style={{
                  color: "#92400e",
                  fontSize: "14px",
                  margin: 0,
                  lineHeight: "1.5",
                }}
              >
                {notes}
              </p>
            </div>
          )}

          <p>
            กรุณาคลิกปุ่มด้านล่างเพื่ออัปเดตรูปบัตร TCC ของคุณ | Please click
            the button below to update your TCC card.
          </p>
        </div>
      }
      ctaButton={
        ctaUrl
          ? {
              text: "อัปเดตรูปบัตร TCC | Update TCC Card",
              url: ctaUrl,
              color: "primary",
            }
          : undefined
      }
      showTrackingCode={true}
      applicantName={applicantName}
      trackingCode={trackingCode}
      supportEmail={supportEmail}
      brandTokens={brandTokens}
    />
  );
};
