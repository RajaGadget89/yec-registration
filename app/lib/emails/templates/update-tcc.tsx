import React from 'react';
import { emailTheme } from '../theme';
import { EmailTemplateProps } from '../registry';

export const UpdateTccTemplate: React.FC<EmailTemplateProps> = ({
  applicantName = 'ผู้สมัคร',
  trackingCode,
  ctaUrl,
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
          ต้องการข้อมูลเพิ่มเติม
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
          ขอบคุณที่สมัครเข้าร่วมงาน YEC Day! เราได้ตรวจสอบข้อมูลการสมัครของคุณแล้ว 
          และต้องการให้คุณอัปเดตรูปบัตร TCC
        </p>
        
        <div style={{
          backgroundColor: colors.warning + '20',
          border: `1px solid ${colors.warning}`,
          borderRadius: '8px',
          padding: spacing.lg,
          marginBottom: spacing.lg
        }}>
          <h3 style={{ 
            color: colors.warning, 
            fontSize: '18px', 
            marginBottom: spacing.sm 
          }}>
            สิ่งที่ต้องทำ
          </h3>
          <p style={{ 
            fontSize: '16px', 
            lineHeight: '1.6', 
            marginBottom: spacing.md 
          }}>
            กรุณาอัปโหลดรูปบัตร TCC ที่ถูกต้องและชัดเจน
          </p>
          
          <ul style={{ 
            margin: 0, 
            paddingLeft: spacing.lg,
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            <li>ตรวจสอบให้แน่ใจว่าบัตร TCC ยังไม่หมดอายุ</li>
            <li>รูปภาพต้องแสดงรายละเอียดบัตรอย่างชัดเจน</li>
            <li>ตรวจสอบว่าบัตรเป็นของท่านเองและถูกต้อง</li>
            <li>ไฟล์ต้องเป็นรูปภาพที่อ่านได้ (JPG, PNG)</li>
          </ul>
        </div>
        
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
        </div>
        
        {ctaUrl && (
          <div style={{ textAlign: 'center' as const, marginBottom: spacing.lg }}>
            <a href={ctaUrl} style={{
              ...button.primary,
              fontSize: '16px',
              padding: '16px 32px'
            }}>
              อัปเดตรูปบัตร TCC
            </a>
          </div>
        )}
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
          Additional Information Required
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
          Thank you for registering for YEC Day! We have reviewed your registration 
          and need you to update your TCC card image.
        </p>
        
        <div style={{
          backgroundColor: colors.warning + '20',
          border: `1px solid ${colors.warning}`,
          borderRadius: '8px',
          padding: spacing.lg,
          marginBottom: spacing.lg
        }}>
          <h3 style={{ 
            color: colors.warning, 
            fontSize: '18px', 
            marginBottom: spacing.sm 
          }}>
            Action Required
          </h3>
          <p style={{ 
            fontSize: '16px', 
            lineHeight: '1.6', 
            marginBottom: spacing.md 
          }}>
            Please upload a correct and clear TCC card image
          </p>
          
          <ul style={{ 
            margin: 0, 
            paddingLeft: spacing.lg,
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            <li>Ensure your TCC card is not expired</li>
            <li>The image must clearly show card details</li>
            <li>Verify the card belongs to you and is correct</li>
            <li>File must be a readable image (JPG, PNG)</li>
          </ul>
        </div>
        
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
        </div>
        
        {ctaUrl && (
          <div style={{ textAlign: 'center' as const }}>
            <a href={ctaUrl} style={{
              ...button.primary,
              fontSize: '16px',
              padding: '16px 32px'
            }}>
              Update TCC Card
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

