"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import * as LucideIcons from "lucide-react";

// Icon mapping for social media
const iconMap: { [key: string]: any } = {
  Facebook: LucideIcons.Facebook,
  Instagram: LucideIcons.Instagram,
  Twitter: LucideIcons.Twitter,
  Linkedin: LucideIcons.Linkedin,
  Youtube: LucideIcons.Youtube,
  Tiktok: LucideIcons.MessageCircle,
  Globe: LucideIcons.Globe,
  Mail: LucideIcons.Mail,
  Phone: LucideIcons.Phone,
  MessageCircle: LucideIcons.MessageCircle,
  Share2: LucideIcons.Share2,
};

// Default fallback values
const defaultFooterContent = {
  footer_company_info: {
    title: "YEC Day 2025",
    description:
      "Empowering young entrepreneurs through networking, learning, and growth opportunities. Join us for an unforgettable experience.",
  },
  footer_social_links: [
    {
      platform: "Facebook",
      url: "https://www.facebook.com/YECsongkhla",
      icon_name: "Facebook",
    },
    {
      platform: "Instagram",
      url: "https://www.instagram.com/yec_songkhla?igsh=MTlmdWR3NG90N3BnZQ==",
      icon_name: "Instagram",
    },
    {
      platform: "Website",
      url: "https://www.songkhlachamber.org/",
      icon_name: "Globe",
    },
  ],
  footer_quick_links: [
    {
      label: "About Us",
      url: "https://www.facebook.com/YECsongkhla",
      type: "external",
    },
    {
      label: "Event Schedule",
      url: "event-schedule",
      type: "internal",
    },
    {
      label: "Speakers",
      url: "#",
      type: "external",
    },
    {
      label: "Registration",
      url: "form",
      type: "internal",
    },
  ],
  footer_contact_info: {
    email: "yecsongkhla.official@gmail.com",
    phone: "074 246 388",
    address:
      "29 ถนนโชติวิทยะกุล 4 ตำบล หาดใหญ่ อำเภอ หาดใหญ่ จังหวัด สงขลา 90110",
  },
  footer_copyright: {
    main_text: "2025 YEC Day. All rights reserved.",
    credit_text: "© Power By: Mr. Pisut Khungkamano",
  },
};

function scrollToSection(targetId: string) {
  if (typeof window === "undefined") return;
  const el = document.getElementById(targetId);
  if (!el) return;
  const header = document.querySelector("header");
  const headerHeight = header ? (header as HTMLElement).offsetHeight : 96;
  const top = el.offsetTop - headerHeight;
  window.scrollTo({ top, behavior: "smooth" });
}

export default function Footer() {
  const [branding, setBranding] = useState<any>(null);
  const [footerContent, setFooterContent] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load branding
        const brandingRes = await fetch("/api/cms/branding", {
          cache: "no-store",
        });
        if (brandingRes.ok) {
          const brandingData = await brandingRes.json();
          setBranding(brandingData.branding || null);
        }

        // Load footer content
        const footerRes = await fetch("/api/cms/footer", { cache: "no-store" });
        if (footerRes.ok) {
          const footerData = await footerRes.json();
          setFooterContent(footerData.footer || null);
        }
      } catch (_) {}
    };

    // Use requestIdleCallback to avoid blocking hydration
    if (window.requestIdleCallback) {
      window.requestIdleCallback(loadData);
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(loadData, 100);
    }
  }, []);

  // Use CMS content or fallback to defaults
  const companyInfo =
    footerContent?.footer_company_info ||
    defaultFooterContent.footer_company_info;
  const socialLinks =
    footerContent?.footer_social_links ||
    defaultFooterContent.footer_social_links;
  const quickLinks =
    footerContent?.footer_quick_links ||
    defaultFooterContent.footer_quick_links;
  const contactInfo =
    footerContent?.footer_contact_info ||
    defaultFooterContent.footer_contact_info;
  const copyrightInfo =
    footerContent?.footer_copyright || defaultFooterContent.footer_copyright;

  // Helper function to render social media icons
  const renderSocialIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || LucideIcons.Globe;
    return <IconComponent className="h-6 w-6" />;
  };
  return (
    <footer className="bg-yec-primary text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            {/* Logo: swap by breakpoint just like header */}
            <div className="mb-4">
              {/* Desktop */}
              <div className="hidden md:block">
                <Image
                  src={branding?.logo_desktop_url || "/assets/logo-full.png"}
                  alt="YEC Day Logo"
                  width={200}
                  height={66}
                  className="h-16 w-auto"
                  priority
                />
              </div>
              {/* Mobile */}
              <div className="md:hidden">
                <Image
                  src={
                    branding?.logo_mobile_url || "/assets/logo-shield-only.png"
                  }
                  alt="YEC Day Logo"
                  width={100}
                  height={100}
                  className="h-16 w-auto"
                  priority
                />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-4">{companyInfo.title}</h3>
            <p className="text-gray-300 mb-6">{companyInfo.description}</p>
            <div className="flex space-x-4">
              {socialLinks.map((link: any, index: number) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-yec-accent transition-colors"
                >
                  <span className="sr-only">{link.platform}</span>
                  {renderSocialIcon(link.icon_name)}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((link: any, index: number) => (
                <li key={index}>
                  {link.type === "internal" ? (
                    <button
                      onClick={() => scrollToSection(link.url)}
                      className="text-left text-gray-300 hover:text-yec-accent transition-colors inline-flex items-center gap-1 group"
                    >
                      {link.label}
                      <span
                        className="w-0 group-hover:w-8 h-px bg-current transition-all duration-500 ml-1"
                        aria-hidden="true"
                      ></span>
                    </button>
                  ) : (
                    <a
                      href={link.url}
                      className="text-gray-300 hover:text-yec-accent transition-colors"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-gray-300" suppressHydrationWarning>
              <li>
                <b>Email:</b> {contactInfo.email}
              </li>
              <li>
                <b>Phone:</b> {contactInfo.phone}
              </li>
              <li>
                <b>Address:</b> {contactInfo.address}
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-300">
          <p>{copyrightInfo.main_text}</p>
          <p>{copyrightInfo.credit_text}</p>
        </div>
      </div>
    </footer>
  );
}
