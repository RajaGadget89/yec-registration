import React from "react";
import { EmailTemplateProps } from "../registry";
import { MasterEmailTemplate } from "./MasterEmailTemplate";

export const TrackingTemplate: React.FC<EmailTemplateProps> = ({
  applicantName = "ผู้สมัคร",
  trackingCode,
  supportEmail,
  brandTokens,
}) => {
  return (
    <MasterEmailTemplate
      title="ยินดีต้อนรับสู่ YEC Day! | Welcome to YEC Day!"
      content={
        <p>
          ขอบคุณที่สมัครเข้าร่วมงาน YEC Day! เราได้รับคำขอลงทะเบียนของคุณแล้ว
          และกำลังดำเนินการตรวจสอบข้อมูล | Thank you for registering for YEC
          Day! We have received your registration request and are processing
          your information.
        </p>
      }
      showTrackingCode={true}
      showNextSteps={true}
      applicantName={applicantName}
      trackingCode={trackingCode}
      supportEmail={supportEmail}
      brandTokens={brandTokens}
    />
  );
};
