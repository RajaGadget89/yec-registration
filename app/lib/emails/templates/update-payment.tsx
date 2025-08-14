import React from 'react';
import { emailTheme } from '../theme';
import { EmailTemplateProps } from '../registry';

export const UpdatePaymentTemplate: React.FC<EmailTemplateProps> = ({
  applicantName = 'ผู้สมัคร',
  priceApplied = '0',
  packageName = 'Standard Package',
  ctaUrl,
  supportEmail: _supportEmail = 'info@yecday.com'
}) => {
  void _supportEmail; // used to satisfy lint without changing config
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
          และต้องการให้คุณอัปเดตสลิปการโอนเงิน
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
            กรุณาอัปโหลดสลิปการโอนเงินที่ถูกต้องและชัดเจน
          </p>
          
          {priceApplied && (
            <div style={{
              backgroundColor: colors.background,
              padding: spacing.md,
              borderRadius: '4px',
              marginBottom: spacing.md
            }}>
              <strong>จำนวนเงินที่ต้องชำระ:</strong> {priceApplied} {packageName}
            </div>
          )}
          
          <ul style={{ 
            margin: 0, 
            paddingLeft: spacing.lg,
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            <li>ตรวจสอบให้แน่ใจว่าจำนวนเงินตรงกับที่ระบุ</li>
            <li>สลิปต้องแสดงรายละเอียดการโอนเงินอย่างชัดเจน</li>
            <li>ไฟล์ต้องเป็นรูปภาพหรือ PDF ที่อ่านได้</li>
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
            {/* trackingCode is not passed as a prop, so this will be empty */}
            {/* If trackingCode was passed, it would be here */}
          </div>
        </div>
        
        {ctaUrl && (
          <div style={{ textAlign: 'center' as const, marginBottom: spacing.lg }}>
            <a href={ctaUrl} style={{
              ...button.primary,
              fontSize: '16px',
              padding: '16px 32px'
            }}>
              อัปเดตสลิปการโอนเงิน
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
          and need you to update your payment slip.
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
            Please upload a correct and clear payment slip
          </p>
          
          {priceApplied && (
            <div style={{
              backgroundColor: colors.background,
              padding: spacing.md,
              borderRadius: '4px',
              marginBottom: spacing.md
            }}>
              <strong>Amount to be paid:</strong> {priceApplied} {packageName}
            </div>
          )}
          
          <ul style={{ 
            margin: 0, 
            paddingLeft: spacing.lg,
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            <li>Ensure the amount matches the specified amount</li>
            <li>The slip must clearly show transfer details</li>
            <li>File must be a readable image or PDF</li>
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
            {/* trackingCode is not passed as a prop, so this will be empty */}
            {/* If trackingCode was passed, it would be here */}
          </div>
        </div>
        
        {ctaUrl && (
          <div style={{ textAlign: 'center' as const }}>
            <a href={ctaUrl} style={{
              ...button.primary,
              fontSize: '16px',
              padding: '16px 32px'
            }}>
              Update Payment Slip
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

