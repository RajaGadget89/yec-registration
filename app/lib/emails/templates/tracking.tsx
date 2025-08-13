import React from 'react';
import { emailTheme } from '../theme';
import { EmailTemplateProps } from '../registry';

export const TrackingTemplate: React.FC<EmailTemplateProps> = ({
  applicantName = 'ผู้สมัคร',
  trackingCode,
  supportEmail = 'info@yecday.com'
}) => {
  const { colors, spacing, button } = emailTheme;

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      {/* Thai Content */}
      <div style={{ marginBottom: spacing.xl }}>
        <h2 style={{ 
          color: colors.primary, 
          fontSize: '24px', 
          marginBottom: spacing.md,
          textAlign: 'center' as const
        }}>
          ยินดีต้อนรับสู่ YEC Day!
        </h2>
        
        <p style={{ 
          fontSize: '16px', 
          lineHeight: '1.6', 
          marginBottom: spacing.md 
        }}>
          สวัสดี {applicantName} ที่รัก
        </p>
        
        <p style={{ 
          fontSize: '16px', 
          lineHeight: '1.6', 
          marginBottom: spacing.lg 
        }}>
          ขอบคุณที่สมัครเข้าร่วมงาน YEC Day! เราได้รับคำขอลงทะเบียนของคุณแล้ว 
          และกำลังดำเนินการตรวจสอบข้อมูล
        </p>
        
        <div style={{
          backgroundColor: colors.gray[50],
          border: `2px solid ${colors.accent}`,
          borderRadius: '8px',
          padding: spacing.lg,
          marginBottom: spacing.lg,
          textAlign: 'center' as const
        }}>
          <h3 style={{ 
            color: colors.primary, 
            fontSize: '18px', 
            marginBottom: spacing.sm 
          }}>
            รหัสติดตามการสมัคร
          </h3>
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: colors.accent,
            fontFamily: 'monospace',
            letterSpacing: '2px'
          }}>
            {trackingCode}
          </div>
          <p style={{ 
            fontSize: '14px', 
            color: colors.gray[600], 
            marginTop: spacing.sm 
          }}>
            เก็บรหัสนี้ไว้เพื่อติดตามสถานะการสมัคร
          </p>
        </div>
        
        <div style={{
          backgroundColor: colors.highlight + '20',
          border: `1px solid ${colors.highlight}`,
          borderRadius: '8px',
          padding: spacing.md,
          marginBottom: spacing.lg
        }}>
          <h4 style={{ 
            color: colors.primary, 
            fontSize: '16px', 
            marginBottom: spacing.sm 
          }}>
            ขั้นตอนต่อไป
          </h4>
          <ul style={{ 
            margin: 0, 
            paddingLeft: spacing.lg,
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            <li>ทีมงานจะตรวจสอบข้อมูลการสมัครของคุณ</li>
            <li>คุณจะได้รับอีเมลแจ้งเตือนเมื่อการสมัครได้รับการอนุมัติ</li>
            <li>เมื่ออนุมัติแล้ว บัตรประจำตัว YEC Day จะถูกสร้างและส่งให้คุณ</li>
          </ul>
        </div>
      </div>

      {/* English Content */}
      <div style={{ 
        borderTop: `2px solid ${colors.gray[200]}`, 
        paddingTop: spacing.lg 
      }}>
        <h2 style={{ 
          color: colors.primary, 
          fontSize: '24px', 
          marginBottom: spacing.md,
          textAlign: 'center' as const
        }}>
          Welcome to YEC Day!
        </h2>
        
        <p style={{ 
          fontSize: '16px', 
          lineHeight: '1.6', 
          marginBottom: spacing.md 
        }}>
          Dear {applicantName},
        </p>
        
        <p style={{ 
          fontSize: '16px', 
          lineHeight: '1.6', 
          marginBottom: spacing.lg 
        }}>
          Thank you for registering for YEC Day! We have received your registration 
          request and are currently processing your information.
        </p>
        
        <div style={{
          backgroundColor: colors.gray[50],
          border: `2px solid ${colors.accent}`,
          borderRadius: '8px',
          padding: spacing.lg,
          marginBottom: spacing.lg,
          textAlign: 'center' as const
        }}>
          <h3 style={{ 
            color: colors.primary, 
            fontSize: '18px', 
            marginBottom: spacing.sm 
          }}>
            Registration Tracking Code
          </h3>
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: colors.accent,
            fontFamily: 'monospace',
            letterSpacing: '2px'
          }}>
            {trackingCode}
          </div>
          <p style={{ 
            fontSize: '14px', 
            color: colors.gray[600], 
            marginTop: spacing.sm 
          }}>
            Keep this code to track your registration status
          </p>
        </div>
        
        <div style={{
          backgroundColor: colors.highlight + '20',
          border: `1px solid ${colors.highlight}`,
          borderRadius: '8px',
          padding: spacing.md
        }}>
          <h4 style={{ 
            color: colors.primary, 
            fontSize: '16px', 
            marginBottom: spacing.sm 
          }}>
            Next Steps
          </h4>
          <ul style={{ 
            margin: 0, 
            paddingLeft: spacing.lg,
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            <li>Our team will review your registration details</li>
            <li>You will receive an email notification once your registration is approved</li>
            <li>Upon approval, your official YEC Day badge will be generated and sent to you</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

