import React from 'react';
import { emailTheme } from '../theme';
import { EmailTemplateProps } from '../registry';

export const TrackingTemplate: React.FC<EmailTemplateProps> = ({
  applicantName = 'ผู้สมัคร',
  trackingCode,
  supportEmail: _supportEmail = 'info@yecday.com',
  brandTokens
}) => {
  void _supportEmail; // used to satisfy lint without changing config
  const { colors, spacing } = emailTheme;

  // Use brand colors if provided, otherwise use default theme
  const primaryColor = brandTokens?.primaryColor || colors.primary;
  const secondaryColor = brandTokens?.secondaryColor || colors.accent;

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      {/* Thai Content */}
      <div style={{ marginBottom: spacing.xl }}>
        <h2 style={{ 
          color: primaryColor, 
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
          border: `2px solid ${secondaryColor}`,
          borderRadius: '8px',
          padding: spacing.lg,
          marginBottom: spacing.lg,
          textAlign: 'center' as const
        }}>
          <h3 style={{ 
            color: primaryColor, 
            fontSize: '18px', 
            marginBottom: spacing.sm 
          }}>
            รหัสติดตามการสมัคร
          </h3>
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: secondaryColor,
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
            เก็บรหัสนี้ไว้เพื่อติดตามสถานะการสมัครของคุณ
          </p>
        </div>
        
        <div style={{
          backgroundColor: colors.highlight + '20',
          border: `1px solid ${colors.highlight}`,
          borderRadius: '8px',
          padding: spacing.lg,
          marginBottom: spacing.lg
        }}>
          <h3 style={{ 
            color: colors.highlight, 
            fontSize: '18px', 
            marginBottom: spacing.sm 
          }}>
            ขั้นตอนต่อไป
          </h3>
          <ul style={{ 
            margin: 0, 
            paddingLeft: spacing.lg,
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            <li>ทีมงานจะตรวจสอบข้อมูลการสมัครของคุณ</li>
            <li>คุณจะได้รับการแจ้งเตือนเมื่อการตรวจสอบเสร็จสิ้น</li>
            <li>หากต้องการข้อมูลเพิ่มเติม เราจะติดต่อคุณ</li>
          </ul>
        </div>
        
        <div style={{
          backgroundColor: colors.gray[100],
          padding: spacing.lg,
          borderRadius: '8px',
          fontSize: '14px',
          color: colors.gray[700]
        }}>
          <p style={{ margin: 0 }}>
            <strong>หากมีคำถาม:</strong> ติดต่อเราได้ที่ {_supportEmail}
          </p>
          <p style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
            ข้อมูลส่วนบุคคลของคุณจะถูกเก็บรักษาไว้ตามนโยบายการคุ้มครองข้อมูลส่วนบุคคล (PDPA)
          </p>
        </div>
      </div>

      {/* English Content */}
      <div style={{ 
        borderTop: `2px solid ${colors.gray[200]}`, 
        paddingTop: spacing.lg 
      }}>
        <h2 style={{ 
          color: primaryColor, 
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
          border: `2px solid ${secondaryColor}`,
          borderRadius: '8px',
          padding: spacing.lg,
          marginBottom: spacing.lg,
          textAlign: 'center' as const
        }}>
          <h3 style={{ 
            color: primaryColor, 
            fontSize: '18px', 
            marginBottom: spacing.sm 
          }}>
            Registration Tracking Code
          </h3>
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: secondaryColor,
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
          padding: spacing.lg,
          marginBottom: spacing.lg
        }}>
          <h3 style={{ 
            color: colors.highlight, 
            fontSize: '18px', 
            marginBottom: spacing.sm 
          }}>
            Next Steps
          </h3>
          <ul style={{ 
            margin: 0, 
            paddingLeft: spacing.lg,
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            <li>Our team will review your registration information</li>
            <li>You will be notified once the review is complete</li>
            <li>If additional information is needed, we will contact you</li>
          </ul>
        </div>
        
        <div style={{
          backgroundColor: colors.gray[100],
          padding: spacing.lg,
          borderRadius: '8px',
          fontSize: '14px',
          color: colors.gray[700]
        }}>
          <p style={{ margin: 0 }}>
            <strong>Questions?</strong> Contact us at {_supportEmail}
          </p>
          <p style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
            Your personal information will be protected according to our Personal Data Protection Policy (PDPA)
          </p>
        </div>
      </div>
    </div>
  );
};

