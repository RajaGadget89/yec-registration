import TopMenuBar from "./components/TopMenuBar";
import HeroSection from "./components/HeroSection";
import NewsFeed from "./components/NewsFeed";
import BannerSection from "./components/BannerSection";
import ActivityCardsSection from "./components/cms/sections/ActivityCards";
import RegistrationForm from "./components/RegistrationForm";
import Footer from "./components/Footer";
import ClientPageHandler from "./components/ClientPageHandler";
import { getLandingPageSections } from "./lib/landing-page-sections";

type Props = {
  searchParams: Promise<{
    token?: string;
    dimension?: string;
    scroll?: string;
  }>;
};

export default async function Home({ searchParams }: Props) {
  // Fetch section visibility settings
  // Wrap in try-catch for extra safety during build time
  let sections: Awaited<ReturnType<typeof getLandingPageSections>> = [];
  try {
    sections = await getLandingPageSections();
  } catch (error) {
    console.error("Error fetching landing page sections in page.tsx:", error);
    // Will use fallback defaults below
    sections = [];
  }

  // If no sections found, default to all visible (fallback)
  if (!sections || sections.length === 0) {
    sections = [
      {
        id: "default-hero",
        section_key: "hero",
        section_name: "Hero Section",
        is_active: true,
        section_order: 1,
        updated_by: null,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        id: "default-news",
        section_key: "news",
        section_name: "News Feed",
        is_active: true,
        section_order: 2,
        updated_by: null,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        id: "default-banner",
        section_key: "banner",
        section_name: "Banner Section",
        is_active: true,
        section_order: 3,
        updated_by: null,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        id: "default-activity-cards",
        section_key: "activity_cards",
        section_name: "Activity Cards",
        is_active: true,
        section_order: 4,
        updated_by: null,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        id: "default-registration",
        section_key: "registration_form",
        section_name: "Registration Form",
        is_active: true,
        section_order: 5,
        updated_by: null,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ];
  }

  // Extract search params for token detection and scroll navigation
  const params = await searchParams;
  const hasToken = !!params.token;
  const hasScrollForm = params.scroll === "form";

  // Find activity_cards section to determine if we should hide activities in BannerSection
  const activityCardsSection = sections.find(
    (section) => section.section_key === "activity_cards",
  );

  // Hide activities in BannerSection if:
  // 1. Activity Cards section exists AND is active (separate section will be shown), OR
  // 2. Activity Cards section exists BUT is inactive (user explicitly hid it, so don't show in BannerSection either)
  const hideActivityCardsInBanner = activityCardsSection
    ? activityCardsSection.is_active // If section exists and is active, hide in banner (separate section will show)
      ? true // Separate section is active, hide in banner
      : true // Section exists but is hidden, also hide in banner (respect user's choice)
    : false; // No separate section exists, show activities in banner (default behavior)

  // Sections are already ordered by section_order from the database
  // Render sections in the order they appear in the sections array
  // Map each section to its corresponding component based on section_key
  const renderSection = (section: (typeof sections)[0]) => {
    const isActive = section.is_active;
    const sectionKey = section.section_key;

    // Special handling for registration form - visible if active OR token/scroll present
    if (sectionKey === "registration_form") {
      const showForm = isActive || hasToken || hasScrollForm;
      if (!showForm) return null;
      return <RegistrationForm key={section.id} />;
    }

    // Render other sections only if active
    if (!isActive) return null;

    switch (sectionKey) {
      case "hero":
        return <HeroSection key={section.id} />;
      case "news":
        return <NewsFeed key={section.id} />;
      case "banner":
        return (
          <BannerSection
            key={section.id}
            hideActivityCards={hideActivityCardsInBanner}
          />
        );
      case "activity_cards":
        return (
          <ActivityCardsSection
            key={section.id}
            title="Activities"
            content={{ limit: 6, grid_cols: "3", sort: "published_at" }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen">
      <ClientPageHandler />
      <TopMenuBar />
      {/* Render sections in the order from database (already sorted by section_order) */}
      <div className="space-y-0">{sections.map(renderSection)}</div>
      <Footer />
    </main>
  );
}
