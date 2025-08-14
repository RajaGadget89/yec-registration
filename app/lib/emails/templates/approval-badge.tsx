import React from 'react';
import { emailTheme } from '../theme';
import { EmailTemplateProps } from '../registry';

export const ApprovalBadgeTemplate: React.FC<EmailTemplateProps> = ({
  applicantName = 'ผู้สมัคร',
  trackingCode,
  badgeUrl,
  supportEmail: _supportEmail = 'info@yecday.com',
  brandTokens
}) => {
  void _supportEmail; // used to satisfy lint without changing config
  const { colors, spacing, button } = emailTheme;

  // Use brand colors if provided, otherwise use default theme
  const primaryColor = brandTokens?.primaryColor || colors.primary;
  const secondaryColor = brandTokens?.secondaryColor || colors.accent;

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      {/* Thai Content */}
      <div style={{ marginBottom: spacing.xl }}>
        <h2 style={{ 
          color: colors.success, 
          fontSize: '24px', 
          marginBottom: spacing.md,
          textAlign: 'center' as const
        }}>
          🎉 อนุมัติเรียบร้อยแล้ว!
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
          ยินดีด้วย! การสมัครเข้าร่วมงาน YEC Day ของคุณได้รับการอนุมัติแล้ว 
          บัตรประจำตัวของคุณพร้อมใช้งาน
        </p>
        
        <div style={{
          backgroundColor: colors.success + '20',
          border: `1px solid ${colors.success}`,
          borderRadius: '8px',
          padding: spacing.lg,
          marginBottom: spacing.lg
        }}>
          <h3 style={{ 
            color: colors.success, 
            fontSize: '18px', 
            marginBottom: spacing.sm 
          }}>
            สถานะการสมัคร
          </h3>
          <p style={{ 
            fontSize: '16px', 
            lineHeight: '1.6', 
            marginBottom: spacing.md 
          }}>
            ✅ การสมัครได้รับการอนุมัติแล้ว
          </p>
          <p style={{ 
            fontSize: '14px', 
            color: colors.gray[600], 
            margin: 0 
          }}>
            คุณสามารถเข้าร่วมงาน YEC Day ได้แล้ว
          </p>
        </div>
        
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
        </div>
        
        {badgeUrl && (
          <div style={{ textAlign: 'center' as const, marginBottom: spacing.lg }}>
            <div style={{
              backgroundColor: colors.gray[50],
              border: `2px solid ${secondaryColor}`,
              borderRadius: '8px',
              padding: spacing.lg,
              marginBottom: spacing.md
            }}>
              <h3 style={{ 
                color: primaryColor, 
                fontSize: '18px', 
                marginBottom: spacing.sm 
              }}>
                บัตรประจำตัว YEC Day ของคุณ
              </h3>
              <p style={{ 
                fontSize: '14px', 
                color: colors.gray[600], 
                marginBottom: spacing.md 
              }}>
                บัตรประจำตัวของคุณพร้อมใช้งานแล้ว
              </p>
              <a href={badgeUrl} style={{
                ...button.primary,
                fontSize: '16px',
                padding: '12px 24px'
              }}>
                ดาวน์โหลดบัตรประจำตัว
              </a>
            </div>
          </div>
        )}
        
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
            ข้อมูลเพิ่มเติม
          </h3>
          <ul style={{ 
            margin: 0, 
            paddingLeft: spacing.lg,
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            <li>เก็บบัตรประจำตัวไว้เพื่อเข้าร่วมงาน</li>
            <li>ตรวจสอบรายละเอียดงานในอีเมลถัดไป</li>
            <li>หากมีคำถาม ติดต่อเราได้ที่ {_supportEmail}</li>
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
          color: colors.success, 
          fontSize: '24px', 
          marginBottom: spacing.md,
          textAlign: 'center' as const
        }}>
          🎉 Approved!
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
          Congratulations! Your YEC Day registration has been approved. 
          Your badge is ready for use.
        </p>
        
        <div style={{
          backgroundColor: colors.success + '20',
          border: `1px solid ${colors.success}`,
          borderRadius: '8px',
          padding: spacing.lg,
          marginBottom: spacing.lg
        }}>
          <h3 style={{ 
            color: colors.success, 
            fontSize: '18px', 
            marginBottom: spacing.sm 
          }}>
            Registration Status
          </h3>
          <p style={{ 
            fontSize: '16px', 
            lineHeight: '1.6', 
            marginBottom: spacing.md 
          }}>
            ✅ Registration approved
          </p>
          <p style={{ 
            fontSize: '14px', 
            color: colors.gray[600], 
            margin: 0 
          }}>
            You can now attend YEC Day
          </p>
        </div>
        
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
        </div>
        
        {badgeUrl && (
          <div style={{ textAlign: 'center' as const, marginBottom: spacing.lg }}>
            <div style={{
              backgroundColor: colors.gray[50],
              border: `2px solid ${secondaryColor}`,
              borderRadius: '8px',
              padding: spacing.lg,
              marginBottom: spacing.md
            }}>
              <h3 style={{ 
                color: primaryColor, 
                fontSize: '18px', 
                marginBottom: spacing.sm 
              }}>
                Your YEC Day Badge
              </h3>
              <p style={{ 
                fontSize: '14px', 
                color: colors.gray[600], 
                marginBottom: spacing.md 
              }}>
                Your badge is ready for download
              </p>
              <a href={badgeUrl} style={{
                ...button.primary,
                fontSize: '16px',
                padding: '12px 24px'
              }}>
                Download Badge
              </a>
            </div>
          </div>
        )}
        
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
            Additional Information
          </h3>
          <ul style={{ 
            margin: 0, 
            paddingLeft: spacing.lg,
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            <li>Keep your badge for event entry</li>
            <li>Check your email for event details</li>
            <li>Contact us at {_supportEmail} if you have questions</li>
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

