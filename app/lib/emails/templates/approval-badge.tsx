import React from 'react';
import { emailTheme } from '../theme';
import { EmailTemplateProps } from '../registry';

export const ApprovalBadgeTemplate: React.FC<EmailTemplateProps> = ({
  applicantName = 'ผู้สมัคร',
  trackingCode,
  badgeUrl,
  supportEmail: _supportEmail = 'info@yecday.com'
}) => {
  void _supportEmail; // used to satisfy lint without changing config
  const { colors, spacing, button } = emailTheme;

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
          border: `2px solid ${colors.success}`,
          borderRadius: '8px',
          padding: spacing.lg,
          marginBottom: spacing.lg,
          textAlign: 'center' as const
        }}>
          <h3 style={{ 
            color: colors.success, 
            fontSize: '20px', 
            marginBottom: spacing.md 
          }}>
            บัตรประจำตัว YEC Day ของคุณ
          </h3>
          
          {badgeUrl ? (
            <div style={{ marginBottom: spacing.md }}>
              {/* Using <img> is required for email HTML. Next/Image is not applicable here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={badgeUrl} 
                alt="YEC Day Badge" 
                style={{
                  maxWidth: '300px',
                  width: '100%',
                  height: 'auto',
                  borderRadius: '8px',
                  border: `2px solid ${colors.accent}`
                }}
              />
            </div>
          ) : (
            <div style={{
              backgroundColor: colors.gray[100],
              padding: spacing.lg,
              borderRadius: '8px',
              marginBottom: spacing.md
            }}>
              <p style={{ 
                color: colors.gray[600], 
                margin: 0,
                fontSize: '16px'
              }}>
                บัตรประจำตัวของคุณพร้อมใช้งาน
              </p>
            </div>
          )}
          
          {badgeUrl && (
            <a href={badgeUrl} style={{
              ...button.primary,
              fontSize: '16px',
              padding: '12px 24px',
              backgroundColor: colors.success
            }}>
              ดาวน์โหลดบัตรประจำตัว
            </a>
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
            สิ่งที่ต้องทำในวันงาน
          </h4>
          <ul style={{ 
            margin: 0, 
            paddingLeft: spacing.lg,
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            <li>นำบัตรประจำตัวมาแสดงที่ประตูเข้า</li>
            <li>มาถึงก่อนเวลาเริ่มงาน 30 นาที</li>
            <li>เตรียมเอกสารประกอบการลงทะเบียน (ถ้ามี)</li>
          </ul>
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
          Your official badge is ready for use.
        </p>
        
        <div style={{
          backgroundColor: colors.success + '20',
          border: `2px solid ${colors.success}`,
          borderRadius: '8px',
          padding: spacing.lg,
          marginBottom: spacing.lg,
          textAlign: 'center' as const
        }}>
          <h3 style={{ 
            color: colors.success, 
            fontSize: '20px', 
            marginBottom: spacing.md 
          }}>
            Your YEC Day Badge
          </h3>
          
          {badgeUrl ? (
            <div style={{ marginBottom: spacing.md }}>
              {/* Using <img> is required for email HTML. Next/Image is not applicable here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={badgeUrl} 
                alt="YEC Day Badge" 
                style={{
                  maxWidth: '300px',
                  width: '100%',
                  height: 'auto',
                  borderRadius: '8px',
                  border: `2px solid ${colors.accent}`
                }}
              />
            </div>
          ) : (
            <div style={{
              backgroundColor: colors.gray[100],
              padding: spacing.lg,
              borderRadius: '8px',
              marginBottom: spacing.md
            }}>
              <p style={{ 
                color: colors.gray[600], 
                margin: 0,
                fontSize: '16px'
              }}>
                Your badge is ready for use
              </p>
            </div>
          )}
          
          {badgeUrl && (
            <a href={badgeUrl} style={{
              ...button.primary,
              fontSize: '16px',
              padding: '12px 24px',
              backgroundColor: colors.success
            }}>
              Download Badge
            </a>
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
            What to do on the event day
          </h4>
          <ul style={{ 
            margin: 0, 
            paddingLeft: spacing.lg,
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            <li>Present your badge at the entrance</li>
            <li>Arrive 30 minutes before the event starts</li>
            <li>Bring any additional registration documents (if required)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

