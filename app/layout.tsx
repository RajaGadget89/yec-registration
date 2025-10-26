import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./contexts/ThemeContext";

// Log email configuration on server boot (dev only)
if (typeof window === "undefined") {
  // Server-side only
  try {
    const { logEmailConfigOnBoot } = await import("./lib/emails/config");
    logEmailConfigOnBoot();
  } catch {
    // Ignore errors in case email config is not available
  }
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: true,
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: true,
  display: "swap",
});

export const metadata: Metadata = {
  title: "YEC Day - Young Entrepreneurs Conference",
  description:
    "Empowering young entrepreneurs through networking, learning, and growth opportunities. Register now for YEC Day!",
  icons: {
    icon: "/assets/favicon.ico",
    apple: "/assets/favicon-192x192.png",
    shortcut: "/assets/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Note: We cannot fetch on server in this client file head tags easily.
  // Use a small client script to swap favicon from Branding if available.
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/assets/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="192x192"
          href="/assets/favicon-192x192.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/assets/favicon-16x16.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/assets/favicon-32x32.png"
        />
        <link rel="manifest" href="/assets/site.webmanifest" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  // Use requestIdleCallback to avoid blocking hydration
                  if (window.requestIdleCallback) {
                    window.requestIdleCallback(function() {
                      fetch('/api/cms/branding', { cache: 'no-store' }).then(function(r){
                        if(!r.ok) return; return r.json();
                      }).then(function(data){
                        if(!data || !data.branding || !data.branding.logo_favicon_url) return;
                        var href = data.branding.logo_favicon_url;
                        var link = document.querySelector('link[rel="icon"]');
                        if(!link){ link = document.createElement('link'); link.rel='icon'; document.head.appendChild(link); }
                        link.href = href;
                      }).catch(function(){});
                    });
                  } else {
                    // Fallback for browsers without requestIdleCallback
                    setTimeout(function() {
                      fetch('/api/cms/branding', { cache: 'no-store' }).then(function(r){
                        if(!r.ok) return; return r.json();
                      }).then(function(data){
                        if(!data || !data.branding || !data.branding.logo_favicon_url) return;
                        var href = data.branding.logo_favicon_url;
                        var link = document.querySelector('link[rel="icon"]');
                        if(!link){ link = document.createElement('link'); link.rel='icon'; document.head.appendChild(link); }
                        link.href = href;
                      }).catch(function(){});
                    }, 100);
                  }
                } catch(e){}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
