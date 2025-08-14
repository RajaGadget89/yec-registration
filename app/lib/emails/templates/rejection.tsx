import React from 'react';
import { emailTheme } from '../theme';
import { EmailTemplateProps } from '../registry';

export const RejectionTemplate: React.FC<EmailTemplateProps> = ({
  applicantName = 'ผู้สมัคร',
  trackingCode,
  rejectedReason = 'other',
  supportEmail: _supportEmail = 'info@yecday.com'
}) => {
  void _supportEmail; // used to satisfy lint without changing config
  const { colors, spacing } = emailTheme;

  // Reason messages in Thai and English
  const reasonMessages = {
    deadline_missed: {
      thai: 'เนื่องจากเกินกำหนดเวลาการสมัครที่กำหนดไว้',
      english: 'due to missing the registration deadline'
    },
    ineligible_rule_match: {
      thai: 'เนื่องจากไม่ตรงตามเงื่อนไขการเข้าร่วมงาน',
      english: 'due to not meeting the eligibility requirements'
    },
    other: {
      thai: 'เนื่องจากเหตุผลอื่นๆ',
      english: 'due to other reasons'
    }
  };

  const currentReason = reasonMessages[rejectedReason];

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      {/* Thai Content */}
      <div style={{ marginBottom: spacing.xl }}>
        <h2 style={{ 
          color: colors.error, 
          fontSize: '24px', 
          marginBottom: spacing.md,
          textAlign: 'center' as const
        }}>
          คำขอสมัครไม่ผ่าน
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
          ขอบคุณที่สนใจเข้าร่วมงาน YEC Day! เราเสียใจที่ต้องแจ้งให้ทราบว่า 
          คำขอสมัครของคุณไม่ได้รับการอนุมัติ {currentReason.thai}
        </p>
        
        <div style={{
          backgroundColor: colors.error + '20',
          border: `1px solid ${colors.error}`,
          borderRadius: '8px',
          padding: spacing.lg,
          marginBottom: spacing.lg
        }}>
          <h3 style={{ 
            color: colors.error, 
            fontSize: '18px', 
            marginBottom: spacing.sm 
          }}>
            สาเหตุการไม่ผ่าน
          </h3>
          <p style={{ 
            fontSize: '16px', 
            lineHeight: '1.6', 
            marginBottom: spacing.md 
          }}>
            {currentReason.thai}
          </p>
          
          {rejectedReason === 'deadline_missed' && (
            <ul style={{ 
              margin: 0, 
              paddingLeft: spacing.lg,
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              <li>การสมัครต้องเสร็จสิ้นก่อนกำหนดเวลาที่กำหนด</li>
              <li>เราไม่สามารถขยายเวลาการสมัครได้</li>
              <li>กรุณาติดตามงานครั้งต่อไป</li>
            </ul>
          )}
          
          {rejectedReason === 'ineligible_rule_match' && (
            <ul style={{ 
              margin: 0, 
              paddingLeft: spacing.lg,
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              <li>ตรวจสอบเงื่อนไขการเข้าร่วมงานอีกครั้ง</li>
              <li>หากมีคำถาม กรุณาติดต่อเรา</li>
              <li>อาจมีสิทธิ์เข้าร่วมงานครั้งต่อไป</li>
            </ul>
          )}
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
            <li>หากมีคำถาม กรุณาติดต่อเรา</li>
            <li>ติดตามงาน YEC Day ครั้งต่อไป</li>
            <li>ตรวจสอบเงื่อนไขการเข้าร่วมงานใหม่</li>
          </ul>
        </div>
      </div>

      {/* English Content */}
      <div style={{ 
        borderTop: `2px solid ${colors.gray[200]}`, 
        paddingTop: spacing.lg 
      }}>
        <h2 style={{ 
          color: colors.error, 
          fontSize: '24px', 
          marginBottom: spacing.md,
          textAlign: 'center' as const
        }}>
          Registration Not Approved
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
          Thank you for your interest in YEC Day! We regret to inform you that 
          your registration has not been approved {currentReason.english}
        </p>
        
        <div style={{
          backgroundColor: colors.error + '20',
          border: `1px solid ${colors.error}`,
          borderRadius: '8px',
          padding: spacing.lg,
          marginBottom: spacing.lg
        }}>
          <h3 style={{ 
            color: colors.error, 
            fontSize: '18px', 
            marginBottom: spacing.sm 
          }}>
            Reason for Rejection
          </h3>
          <p style={{ 
            fontSize: '16px', 
            lineHeight: '1.6', 
            marginBottom: spacing.md 
          }}>
            {currentReason.english}
          </p>
          
          {rejectedReason === 'deadline_missed' && (
            <ul style={{ 
              margin: 0, 
              paddingLeft: spacing.lg,
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              <li>Registration must be completed before the specified deadline</li>
              <li>We cannot extend the registration period</li>
              <li>Please follow us for future events</li>
            </ul>
          )}
          
          {rejectedReason === 'ineligible_rule_match' && (
            <ul style={{ 
              margin: 0, 
              paddingLeft: spacing.lg,
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              <li>Please review the eligibility requirements</li>
              <li>Contact us if you have any questions</li>
              <li>You may be eligible for future events</li>
            </ul>
          )}
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
            <li>Contact us if you have any questions</li>
            <li>Follow us for future YEC Day events</li>
            <li>Review eligibility requirements for future events</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

