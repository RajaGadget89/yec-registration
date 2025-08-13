import React from 'react';
import { emailTheme } from '../theme';

interface BaseLayoutProps {
  children: React.ReactNode;
  supportEmail?: string;
}

export const BaseLayout: React.FC<BaseLayoutProps> = ({ 
  children, 
  supportEmail = 'info@yecday.com' 
}) => {
  const { colors, spacing, containerWidth, header, footer } = emailTheme;

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>YEC Day</title>
      </head>
      <body style={{ 
        margin: 0, 
        padding: 0, 
        backgroundColor: colors.gray[50],
        fontFamily: 'Arial, Helvetica, sans-serif'
      }}>
        {/* Email Container */}
        <div style={{
          maxWidth: containerWidth,
          margin: '0 auto',
          backgroundColor: colors.background,
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
          {/* Header with Logo and Brand Bar */}
          <div style={{
            backgroundColor: header.backgroundColor,
            color: header.color,
            padding: header.padding,
            textAlign: header.textAlign
          }}>
            <div style={{
              fontSize: '28px',
              fontWeight: 'bold',
              marginBottom: spacing.sm
            }}>
              YEC Day
            </div>
            <div style={{
              fontSize: '16px',
              opacity: 0.9
            }}>
              Young Entrepreneurs Chamber
            </div>
          </div>

          {/* Brand Color Bar */}
          <div style={{
            height: '4px',
            background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.accent} 50%, ${colors.highlight} 100%)`
          }} />

          {/* Main Content */}
          <div style={{
            padding: spacing.xl,
            backgroundColor: colors.background
          }}>
            {children}
          </div>

          {/* Footer with PDPA */}
          <div style={{
            backgroundColor: footer.backgroundColor,
            color: footer.color,
            padding: footer.padding,
            fontSize: footer.fontSize,
            textAlign: footer.textAlign,
            borderTop: `1px solid ${colors.gray[200]}`
          }}>
            <div style={{ marginBottom: spacing.sm }}>
              <strong>YEC Day Team</strong>
            </div>
            
            <div style={{ marginBottom: spacing.sm }}>
              หากมีคำถาม กรุณาติดต่อเรา<br />
              If you have any questions, please contact us
            </div>
            
            <div style={{ marginBottom: spacing.md }}>
              <a href={`mailto:${supportEmail}`} style={{
                color: colors.accent,
                textDecoration: 'none'
              }}>
                {supportEmail}
              </a>
            </div>
            
            <div style={{
              fontSize: '12px',
              lineHeight: '1.4',
              color: colors.gray[500]
            }}>
              <strong>PDPA Notice:</strong><br />
              ข้อมูลส่วนบุคคลของคุณจะถูกใช้เพื่อการลงทะเบียนและติดต่อเท่านั้น<br />
              Your personal data will be used for registration and contact purposes only
            </div>
          </div>
        </div>
      </body>
    </html>
  );
};

