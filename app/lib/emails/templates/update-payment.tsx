import React from "react";
import { EmailTemplateProps } from "../registry";
import { MasterEmailTemplate } from "./MasterEmailTemplate";

export const UpdatePaymentTemplate: React.FC<EmailTemplateProps> = ({
  applicantName = "ผู้สมัคร",
  trackingCode,
  priceApplied = "0",
  packageName = "Standard Package",
  ctaUrl,
  supportEmail,
  brandTokens,
  notes,
}) => {
  return (
    <MasterEmailTemplate
      title="ต้องการข้อมูลเพิ่มเติม | Additional Information Required"
      content={
        <div>
          <p>
            ขอบคุณที่สมัครเข้าร่วมงาน YEC Day! เราได้ตรวจสอบข้อมูลการสมัครของคุณแล้ว
            และต้องการให้คุณอัปเดตสลิปโอนเงิน | Thank you for registering for YEC Day! 
            We have reviewed your registration and need you to update your payment slip.
          </p>
          
          <div style={{
            backgroundColor: "#f0f9ff",
            border: "1px solid #0ea5e9",
            borderRadius: "8px",
            padding: "16px",
            margin: "16px 0",
          }}>
            <h4 style={{
              color: "#0c4a6e",
              fontSize: "16px",
              fontWeight: "600",
              margin: "0 0 8px 0",
            }}>
              รายละเอียดแพ็กเกจ | Package Details:
            </h4>
            <p style={{
              color: "#0c4a6e",
              fontSize: "14px",
              margin: "0 0 4px 0",
            }}>
              <strong>แพ็กเกจ | Package:</strong> {packageName}
            </p>
            <p style={{
              color: "#0c4a6e",
              fontSize: "14px",
              margin: 0,
            }}>
              <strong>ราคา | Price:</strong> ฿{priceApplied}
            </p>
          </div>
          
          {notes && (
            <div style={{
              backgroundColor: "#fef3c7",
              border: "1px solid #f59e0b",
              borderRadius: "8px",
              padding: "16px",
              margin: "16px 0",
            }}>
              <h4 style={{
                color: "#92400e",
                fontSize: "16px",
                fontWeight: "600",
                margin: "0 0 8px 0",
              }}>
                หมายเหตุจากทีมงาน | Team Notes:
              </h4>
              <p style={{
                color: "#92400e",
                fontSize: "14px",
                margin: 0,
                lineHeight: "1.5",
              }}>
                {notes}
              </p>
            </div>
          )}
          
          <p>
            กรุณาคลิกปุ่มด้านล่างเพื่ออัปเดตสลิปโอนเงินของคุณ | 
            Please click the button below to update your payment slip.
          </p>
        </div>
      }
      ctaButton={ctaUrl ? {
        text: "อัปเดตสลิปโอนเงิน | Update Payment Slip",
        url: ctaUrl,
        color: "primary"
      } : undefined}
      showTrackingCode={true}
      applicantName={applicantName}
      trackingCode={trackingCode}
      supportEmail={supportEmail}
      brandTokens={brandTokens}
    />
  );
};