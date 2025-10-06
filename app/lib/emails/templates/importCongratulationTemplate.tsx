import React from "react";
// import { EmailTemplateProps } from '../types';

interface _ImportCongratulationData {
  firstName: string;
  lastName: string;
  trackingCode: string;
  badgeUrl: string;
  registrationId: string;
}

export const ImportCongratulationTemplate: React.FC<any> = ({
  // EmailTemplateProps type not available
  data,
  brandTokens,
}) => {
  const { firstName, lastName, trackingCode, badgeUrl, registrationId } = data;

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        maxWidth: "600px",
        margin: "0 auto",
        backgroundColor: "#f8f9fa",
        padding: "20px",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "#2F68C9",
          color: "white",
          padding: "30px",
          textAlign: "center",
          borderRadius: "10px 10px 0 0",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "bold" }}>
          🎉 ยินดีด้วย!
        </h1>
        <p style={{ margin: "10px 0 0 0", fontSize: "18px", opacity: 0.9 }}>
          คุณได้เข้าร่วมกิจกรรม YEC DAY 2025 เรียบร้อยแล้ว
        </p>
      </div>

      {/* Main Content */}
      <div
        style={{
          backgroundColor: "white",
          padding: "40px",
          borderRadius: "0 0 10px 10px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* Greeting */}
        <div style={{ marginBottom: "30px" }}>
          <h2
            style={{
              color: "#2F68C9",
              fontSize: "24px",
              margin: "0 0 15px 0",
              fontWeight: "bold",
            }}
          >
            สวัสดี คุณ{firstName} {lastName}
          </h2>
          <p
            style={{
              fontSize: "16px",
              lineHeight: "1.6",
              color: "#333",
              margin: 0,
            }}
          >
            ขอแสดงความยินดีที่คุณได้เข้าร่วมกิจกรรม YEC DAY 2025 เรียบร้อยแล้ว!
            เราได้เตรียมบัตรเข้าร่วมกิจกรรมและข้อมูลสำคัญไว้ให้คุณแล้ว
          </p>
        </div>

        {/* Registration Details */}
        <div
          style={{
            backgroundColor: "#f8f9fa",
            padding: "25px",
            borderRadius: "8px",
            marginBottom: "30px",
            border: "2px solid #e9ecef",
          }}
        >
          <h3
            style={{
              color: "#2F68C9",
              fontSize: "20px",
              margin: "0 0 20px 0",
              fontWeight: "bold",
            }}
          >
            📋 ข้อมูลการลงทะเบียน
          </h3>

          <div style={{ marginBottom: "15px" }}>
            <strong style={{ color: "#495057" }}>รหัสติดตาม:</strong>
            <span
              style={{
                backgroundColor: "#2F68C9",
                color: "white",
                padding: "5px 12px",
                borderRadius: "4px",
                marginLeft: "10px",
                fontFamily: "monospace",
                fontWeight: "bold",
              }}
            >
              {trackingCode}
            </span>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <strong style={{ color: "#495057" }}>รหัสลงทะเบียน:</strong>
            <span
              style={{
                color: "#2F68C9",
                fontWeight: "bold",
                marginLeft: "10px",
              }}
            >
              {registrationId}
            </span>
          </div>
        </div>

        {/* Badge Section */}
        {badgeUrl && (
          <div
            style={{
              textAlign: "center",
              marginBottom: "30px",
              padding: "25px",
              backgroundColor: "#fff3cd",
              borderRadius: "8px",
              border: "2px solid #ffeaa7",
            }}
          >
            <h3
              style={{
                color: "#856404",
                fontSize: "20px",
                margin: "0 0 15px 0",
                fontWeight: "bold",
              }}
            >
              🏆 บัตรเข้าร่วมกิจกรรม
            </h3>
            <p
              style={{
                fontSize: "16px",
                color: "#856404",
                margin: "0 0 20px 0",
              }}
            >
              บัตรเข้าร่วมกิจกรรมของคุณพร้อมแล้ว! กรุณาดาวน์โหลดและเก็บไว้
            </p>
            <a
              href={badgeUrl}
              style={{
                display: "inline-block",
                backgroundColor: "#28a745",
                color: "white",
                padding: "12px 25px",
                textDecoration: "none",
                borderRadius: "6px",
                fontWeight: "bold",
                fontSize: "16px",
              }}
            >
              📥 ดาวน์โหลดบัตรเข้าร่วมกิจกรรม
            </a>
          </div>
        )}

        {/* Important Information */}
        <div
          style={{
            backgroundColor: "#d1ecf1",
            padding: "25px",
            borderRadius: "8px",
            marginBottom: "30px",
            border: "2px solid #bee5eb",
          }}
        >
          <h3
            style={{
              color: "#0c5460",
              fontSize: "18px",
              margin: "0 0 15px 0",
              fontWeight: "bold",
            }}
          >
            ⚠️ ข้อมูลสำคัญ
          </h3>
          <ul
            style={{
              color: "#0c5460",
              fontSize: "14px",
              lineHeight: "1.6",
              margin: 0,
              paddingLeft: "20px",
            }}
          >
            <li>กรุณาเก็บรหัสติดตามไว้เพื่อใช้ในการติดต่อ</li>
            <li>บัตรเข้าร่วมกิจกรรมจะใช้ในการเข้าร่วมกิจกรรม</li>
            <li>หากมีข้อสงสัย กรุณาติดต่อทีมงาน YEC</li>
            <li>ข้อมูลการลงทะเบียนจะถูกเก็บเป็นความลับ</li>
          </ul>
        </div>

        {/* Contact Information */}
        <div
          style={{
            textAlign: "center",
            padding: "20px",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
            border: "1px solid #dee2e6",
          }}
        >
          <h4
            style={{
              color: "#2F68C9",
              fontSize: "16px",
              margin: "0 0 10px 0",
              fontWeight: "bold",
            }}
          >
            📞 ติดต่อทีมงาน
          </h4>
          <p
            style={{
              fontSize: "14px",
              color: "#6c757d",
              margin: 0,
            }}
          >
            หากมีข้อสงสัยหรือต้องการความช่วยเหลือ
            <br />
            กรุณาติดต่อทีมงาน YEC ผ่านช่องทางต่างๆ
          </p>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          textAlign: "center",
          padding: "20px",
          color: "#6c757d",
          fontSize: "12px",
        }}
      >
        <p style={{ margin: "0 0 10px 0" }}>
          อีเมลนี้ถูกส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับ
        </p>
        <p style={{ margin: 0 }}>© 2025 YEC DAY - All rights reserved</p>
      </div>
    </div>
  );
};

export default ImportCongratulationTemplate;
