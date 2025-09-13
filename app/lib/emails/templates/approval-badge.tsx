import React from "react";
import { EmailTemplateProps } from "../registry";
import { MasterEmailTemplate } from "./MasterEmailTemplate";

export const ApprovalBadgeTemplate: React.FC<EmailTemplateProps> = ({
  applicantName = "ผู้สมัคร",
  trackingCode,
  badgeUrl,
  supportEmail,
  brandTokens,
}) => {
  return (
    <MasterEmailTemplate
      title="🎉 อนุมัติเรียบร้อย — เจอกันในงาน! | Approved — See You at the Seminar!"
      content={
        <div>
          <div
            style={{
              backgroundColor: "#dcfce7",
              border: "1px solid #16a34a",
              borderRadius: "8px",
              padding: "20px",
              margin: "16px 0",
              textAlign: "center" as const,
            }}
          >
            <h3
              style={{
                color: "#15803d",
                fontSize: "20px",
                fontWeight: "600",
                margin: "0 0 12px 0",
              }}
            >
              🎊 ยินดีด้วย! | Congratulations! 🎊
            </h3>
            <p
              style={{
                color: "#15803d",
                fontSize: "16px",
                margin: 0,
                lineHeight: "1.5",
              }}
            >
              การสมัครของคุณได้รับการอนุมัติแล้ว! | Your registration has been
              approved!
            </p>
          </div>

          <p>
            ขอบคุณที่สมัครเข้าร่วมงาน YEC Day!
            เราได้ตรวจสอบข้อมูลการสมัครของคุณแล้ว
            และยินดีที่จะแจ้งให้ทราบว่าคุณได้รับการอนุมัติให้เข้าร่วมงานแล้ว |
            Thank you for registering for YEC Day! We have reviewed your
            registration and are pleased to inform you that you have been
            approved to attend the event.
          </p>

          {badgeUrl && (
            <div
              style={{
                textAlign: "center" as const,
                margin: "24px 0",
              }}
            >
              <h4
                style={{
                  color: "#1f2937",
                  fontSize: "18px",
                  fontWeight: "600",
                  margin: "0 0 16px 0",
                }}
              >
                บัตรเข้าร่วมงานของคุณ | Your Event Badge:
              </h4>
              <img
                src={badgeUrl}
                alt="YEC Day Event Badge"
                style={{
                  maxWidth: "300px",
                  height: "auto",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  margin: "12px 0 0 0",
                }}
              >
                กรุณาพิมพ์หรือบันทึกบัตรนี้เพื่อนำมาแสดงในวันงาน | Please print
                or save this badge to present at the event.
              </p>
            </div>
          )}

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
              📅 ข้อมูลสำคัญ | Important Information:
            </h4>
            <ul
              style={{
                color: "#92400e",
                fontSize: "14px",
                margin: 0,
                paddingLeft: "20px",
                lineHeight: "1.6",
              }}
            >
              <li>
                กรุณามาในวันงานตามเวลาที่กำหนด | Please arrive at the event on
                time
              </li>
              <li>นำบัตรประจำตัวประชาชนมาด้วย | Bring your ID card</li>
              <li>
                หากมีคำถามติดต่อทีมงานได้ตลอดเวลา | Contact our team if you have
                any questions
              </li>
            </ul>
          </div>
        </div>
      }
      showTrackingCode={true}
      applicantName={applicantName}
      trackingCode={trackingCode}
      supportEmail={supportEmail}
      brandTokens={brandTokens}
    />
  );
};
