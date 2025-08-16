import React from "react";
import { emailTheme } from "../theme";

interface BaseLayoutProps {
  children: React.ReactNode;
  supportEmail?: string;
}

export const BaseLayout: React.FC<BaseLayoutProps> = ({
  children,
  supportEmail = "info@yecday.com",
}) => {
  const { colors, containerWidth, header, footer } = emailTheme;

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>YEC Day</title>
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: colors.gray[50],
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        {/* Email Container */}
        <div
          style={{
            maxWidth: containerWidth,
            margin: "0 auto",
            backgroundColor: colors.background,
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
        >
          {/* Header with Logo and Brand Bar */}
          <div
            style={{
              backgroundColor: header.backgroundColor,
              color: header.color,
              padding: "20px 24px",
              textAlign: "center" as const,
            }}
          >
            {/* Logo and Text Container - Table-based Layout for Email Compatibility */}
            <table
              style={{
                width: "100%",
                maxWidth: "800px",
                margin: "0 auto",
                borderCollapse: "collapse",
              }}
            >
              <tr>
                {/* YEC Logo Cell */}
                <td
                  style={{
                    width: "120px",
                    verticalAlign: "middle",
                    textAlign: "left" as const,
                    paddingRight: "48px",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://wvwzhpyvogwypmqgvtjv.supabase.co/storage/v1/object/public/yec-assets/logo-full.png"
                    alt="YEC Day Logo"
                    style={{
                      width: "120px",
                      height: "auto",
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                </td>

                {/* Text Container Cell */}
                <td
                  style={{
                    verticalAlign: "middle",
                    textAlign: "left" as const,
                    paddingLeft: "48px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      marginBottom: "4px",
                      lineHeight: "1.2",
                    }}
                  >
                    YEC Day
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      opacity: 0.9,
                      lineHeight: "1.3",
                    }}
                  >
                    Young Entrepreneurs Chamber
                  </div>
                </td>
              </tr>
            </table>
          </div>

          {/* Brand Color Bar */}
          <div
            style={{
              height: "4px",
              background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.accent} 50%, ${colors.highlight} 100%)`,
            }}
          />

          {/* Main Content - Reduced Padding */}
          <div
            style={{
              padding: "24px",
              backgroundColor: colors.background,
            }}
          >
            {children}
          </div>

          {/* Compact Footer */}
          <div
            style={{
              backgroundColor: footer.backgroundColor,
              color: footer.color,
              padding: "16px 24px",
              fontSize: "12px",
              textAlign: "center" as const,
              borderTop: `1px solid ${colors.gray[200]}`,
            }}
          >
            <div style={{ marginBottom: "8px" }}>
              <strong>YEC Day Team</strong>
            </div>

            <div style={{ marginBottom: "8px" }}>
              <a
                href={`mailto:${supportEmail}`}
                style={{
                  color: colors.accent,
                  textDecoration: "none",
                  fontWeight: "bold",
                }}
              >
                {supportEmail}
              </a>
            </div>

            <div
              style={{
                fontSize: "11px",
                lineHeight: "1.3",
                color: colors.gray[500],
              }}
            >
              <strong>PDPA Notice:</strong>{" "}
              ข้อมูลส่วนบุคคลของคุณจะถูกใช้เพื่อการลงทะเบียนและติดต่อเท่านั้น |
              Your personal data will be used for registration and contact
              purposes only
            </div>
          </div>
        </div>
      </body>
    </html>
  );
};
