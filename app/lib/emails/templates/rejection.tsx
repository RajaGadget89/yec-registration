import React from "react";
import { EmailTemplateProps } from "../registry";
import { MasterEmailTemplate } from "./MasterEmailTemplate";

export const RejectionTemplate: React.FC<EmailTemplateProps> = ({
  applicantName = "ผู้สมัคร",
  trackingCode,
  // rejectedReason is kept for future template variants
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  rejectedReason,
  notes,
  supportEmail,
  brandTokens,
}) => {
  return (
    <MasterEmailTemplate
      title="คำขอสมัครไม่ผ่าน | Registration Not Approved"
      content={
        <div>
          <div
            style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #ef4444",
              borderRadius: "8px",
              padding: "20px",
              margin: "16px 0",
              textAlign: "center" as const,
            }}
          >
            <h3
              style={{
                color: "#dc2626",
                fontSize: "20px",
                fontWeight: "600",
                margin: "0 0 12px 0",
              }}
            >
              ขออภัย | We Apologize
            </h3>
            <p
              style={{
                color: "#dc2626",
                fontSize: "16px",
                margin: 0,
                lineHeight: "1.5",
              }}
            >
              การสมัครของคุณไม่ผ่านการพิจารณา | Your registration was not
              approved
            </p>
          </div>

          <p>
            ขอบคุณที่สนใจเข้าร่วมงาน YEC Day!
            เราได้ตรวจสอบข้อมูลการสมัครของคุณแล้ว
            และขออภัยที่ต้องแจ้งให้ทราบว่าการสมัครของคุณไม่ผ่านการพิจารณา |
            Thank you for your interest in YEC Day! We have reviewed your
            registration and unfortunately, we must inform you that your
            registration was not approved.
          </p>

          {notes ? (
            <div
              style={{
                backgroundColor: "#fff7ed",
                border: "1px solid #fb923c",
                borderRadius: "8px",
                padding: "16px",
                margin: "16px 0",
              }}
            >
              <h4
                style={{
                  color: "#9a3412",
                  fontSize: "16px",
                  fontWeight: "600",
                  margin: "0 0 8px 0",
                }}
              >
                หมายเหตุจากทีมงาน | Team Notes
              </h4>
              <p
                style={{
                  color: "#9a3412",
                  fontSize: "14px",
                  margin: 0,
                  lineHeight: "1.5",
                }}
              >
                {notes}
              </p>
            </div>
          ) : null}

          <div
            style={{
              backgroundColor: "#f0f9ff",
              border: "1px solid #0ea5e9",
              borderRadius: "8px",
              padding: "16px",
              margin: "16px 0",
            }}
          >
            <h4
              style={{
                color: "#0c4a6e",
                fontSize: "16px",
                fontWeight: "600",
                margin: "0 0 8px 0",
              }}
            >
              ข้อมูลเพิ่มเติม | Additional Information:
            </h4>
            <ul
              style={{
                color: "#0c4a6e",
                fontSize: "14px",
                margin: 0,
                paddingLeft: "20px",
                lineHeight: "1.6",
              }}
            >
              <li>
                คุณสามารถสมัครใหม่ในกิจกรรมครั้งต่อไป | You can apply again for
                future events
              </li>
              <li>
                หากมีคำถามติดต่อทีมงานได้ตลอดเวลา | Contact our team if you have
                any questions
              </li>
              <li>
                เราหวังว่าจะได้พบคุณในโอกาสหน้า | We hope to see you in future
                events
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
