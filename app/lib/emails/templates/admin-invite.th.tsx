import React from "react";
import { BaseLayout } from "../components/BaseLayoutWrapper";

interface AdminInviteEmailProps {
  acceptUrl: string;
  expiresAt: string;
  supportEmail?: string;
}

export function AdminInviteEmail({ acceptUrl, expiresAt, supportEmail }: AdminInviteEmailProps) {
  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  return (
    <BaseLayout>
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <h1 style={{ 
          color: "#1f2937", 
          fontSize: "28px", 
          fontWeight: "bold", 
          marginBottom: "20px" 
        }}>
          เชิญเข้าร่วม Admin Console
        </h1>
        
        <p style={{ 
          color: "#6b7280", 
          fontSize: "16px", 
          lineHeight: "1.6", 
          marginBottom: "30px" 
        }}>
          คุณได้รับเชิญให้เข้าร่วม YEC Registration Admin Console 
          ลิงก์นี้จะหมดอายุใน <strong>48 ชั่วโมง</strong>
        </p>

        <div style={{ marginBottom: "40px" }}>
          <a 
            href={acceptUrl}
            style={{
              display: "inline-block",
              backgroundColor: "#3b82f6",
              color: "white",
              padding: "12px 24px",
              textDecoration: "none",
              borderRadius: "6px",
              fontWeight: "600",
              fontSize: "16px"
            }}
          >
            ยอมรับคำเชิญ
          </a>
        </div>

        <div style={{ 
          backgroundColor: "#f9fafb", 
          padding: "20px", 
          borderRadius: "8px", 
          marginBottom: "30px" 
        }}>
          <h3 style={{ 
            color: "#374151", 
            fontSize: "18px", 
            fontWeight: "600", 
            marginBottom: "15px" 
          }}>
            ข้อมูลสำคัญ
          </h3>
          
          <ul style={{ 
            textAlign: "left", 
            color: "#6b7280", 
            fontSize: "14px", 
            lineHeight: "1.5",
            margin: 0,
            paddingLeft: "20px"
          }}>
            <li style={{ marginBottom: "8px" }}>
              <strong>หมดอายุ:</strong> {formatExpiryDate(expiresAt)}
            </li>
            <li style={{ marginBottom: "8px" }}>
              <strong>สิทธิ์การเข้าถึง:</strong> คุณจะมีสิทธิ์ในการตรวจสอบและจัดการการลงทะเบียน
            </li>
            <li style={{ marginBottom: "8px" }}>
              <strong>ความปลอดภัย:</strong> ลิงก์นี้เป็นเอกลักษณ์และไม่ควรแชร์กับผู้อื่น
            </li>
          </ul>
        </div>

        <p style={{ 
          color: "#6b7280", 
          fontSize: "14px", 
          lineHeight: "1.5" 
        }}>
          หากคุณมีคำถามหรือต้องการความช่วยเหลือ กรุณาติดต่อ{" "}
          <a 
            href={`mailto:${supportEmail || "support@yec.in.th"}`}
            style={{ color: "#3b82f6", textDecoration: "none" }}
          >
            {supportEmail || "support@yec.in.th"}
          </a>
        </p>

        <div style={{ 
          marginTop: "40px", 
          paddingTop: "20px", 
          borderTop: "1px solid #e5e7eb" 
        }}>
          <p style={{ 
            color: "#9ca3af", 
            fontSize: "12px", 
            margin: 0 
          }}>
            หากปุ่มด้านบนไม่ทำงาน กรุณาคัดลอกและวางลิงก์นี้ในเบราว์เซอร์ของคุณ:
          </p>
          <p style={{ 
            color: "#3b82f6", 
            fontSize: "12px", 
            wordBreak: "break-all",
            margin: "10px 0 0 0" 
          }}>
            {acceptUrl}
          </p>
        </div>
      </div>
    </BaseLayout>
  );
}

export default AdminInviteEmail;
