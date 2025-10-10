"use client";

import { useEffect, useState } from "react";
import EventCarousel from "./EventCarousel";
import BlurredBackgroundFill from "./BlurredBackgroundFill";

type Activity = {
  id: string;
  card_slug: string;
  title: string;
  summary?: string;
  image_url?: string;
  icon_emoji?: string;
  published_at?: string;
  external_links?: Array<{
    title: string;
    url: string;
    description?: string;
  }>;
};

export default function BannerSection() {
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [_loading, setLoading] = useState(true);
  const [eventSettings, setEventSettings] = useState<any | null>(null);
  const [_loadingEvent, setLoadingEvent] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/cms/activity-cards?limit=3`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load activities");
        const data = await res.json();
        if (!cancelled) setActivities((data.activities || []).slice(0, 3));
      } catch (_e) {
        if (!cancelled) setActivities([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load active event settings for banner
  useEffect(() => {
    let aborted = false;
    const loadEvent = async () => {
      try {
        const res = await fetch("/api/cms/event-settings/active", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load event settings");
        const data = await res.json();
        if (!aborted) setEventSettings(data.event || null);
      } catch {
        if (!aborted) setEventSettings(null);
      } finally {
        if (!aborted) setLoadingEvent(false);
      }
    };
    loadEvent();
    return () => {
      aborted = true;
    };
  }, []);

  const handleScrollToRegistration = () => {
    const target = document.getElementById("form");
    if (target) {
      const header = document.querySelector("header");
      const headerHeight = header ? header.offsetHeight : 96;
      const targetPosition = target.offsetTop - headerHeight;
      window.scrollTo({ top: targetPosition, behavior: "smooth" });
    }
  };

  return (
    <section
      id="event-schedule"
      className="py-16 bg-white"
      aria-labelledby="event-schedule-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center mb-12">
          <h2
            id="event-schedule-heading"
            className="text-3xl sm:text-4xl font-bold text-yec-primary mb-4"
          >
            {eventSettings?.section_title || "Event Schedule & Activities"}
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {eventSettings?.section_description ||
              "Discover the exciting lineup of activities and networking opportunities planned for YEC Day"}
          </p>
        </header>

        {/* YEC Day Banner - Carousel or Single Image */}
        <EventCarousel
          images={(() => {
            // Primary: Use carousel images if available
            if (
              eventSettings?.banner_images &&
              eventSettings.banner_images.length > 0
            ) {
              return eventSettings.banner_images;
            }

            // Fallback 1: Use banner_image_url if carousel images are empty
            if (eventSettings?.banner_image_url) {
              return [
                {
                  url: eventSettings.banner_image_url,
                  alt: eventSettings.event_name || "YEC Day Banner",
                  order: 0,
                },
              ];
            }

            // Fallback 2: Use default image
            return [
              {
                url: "/assets/YEC-DAY2_cre.png",
                alt: "YEC Day Banner showing Songkhla event details for November 23rd 2025 at Burisriphu Hotel Hatyai",
                order: 0,
              },
            ];
          })()}
          carouselEnabled={eventSettings?.carousel_enabled || false}
          carouselInterval={eventSettings?.carousel_interval || 5}
          className="mb-8"
          ariaLabel="YEC Day event banner featuring Songkhla location, November 23rd 2025 date, and Burisriphu Hotel Hatyai venue"
        />

        {/* Event Highlights - Dynamic Activities */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-4"
          role="list"
          aria-label="Event highlights and activities"
        >
          {(activities && activities.length > 0
            ? activities
            : [
                {
                  id: "a",
                  card_slug: "culture",
                  title: "Culture",
                  summary:
                    "Immerse yourself in the rich cultural heritage and traditions while building meaningful relationships with diverse entrepreneurs and business leaders.",
                  image_url: "/assets/YEC-Networking.png",
                  icon_emoji: "🎭",
                },
                {
                  id: "b",
                  card_slug: "connection",
                  title: "Connection",
                  summary:
                    "Build strong professional relationships and connect with like-minded entrepreneurs who share your vision and passion for business success.",
                  image_url: "/assets/YEC-Learning.png",
                  icon_emoji: "🔗",
                },
                {
                  id: "c",
                  card_slug: "collaboration",
                  title: "Collaboration",
                  summary:
                    "Work together with fellow entrepreneurs to create innovative solutions and partnerships that drive mutual success and business growth.",
                  image_url: "/assets/YEC-Growth.png",
                  icon_emoji: "🤝",
                },
              ]
          ).map((card) => (
            <article
              key={card.id}
              className="group relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 focus-within:ring-4 focus-within:ring-yec-accent focus-within:ring-opacity-50 cursor-pointer"
              role="listitem"
              tabIndex={0}
              onClick={() =>
                window.open(`/activities/${card.card_slug}`, "_blank")
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  window.open(`/activities/${card.card_slug}`, "_blank");
                }
              }}
            >
              <div className="relative h-48 overflow-hidden">
                <BlurredBackgroundFill
                  src={card.image_url || "/assets/YEC-Networking.png"}
                  alt={card.title}
                  className="w-full h-full"
                  aspectRatio="4/3"
                  blurIntensity={15}
                  overlayOpacity={0.2}
                  foregroundClassName="group-hover:scale-110 transition-transform duration-700"
                  backgroundClassName="group-hover:scale-105 transition-transform duration-700"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  aria-hidden="true"
                ></div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-yec-primary mb-3 group-hover:text-yec-accent transition-colors duration-300">
                  <span className="inline-block" aria-hidden="true">
                    {card.icon_emoji || "✨"}
                  </span>{" "}
                  {card.title}
                </h3>
                <p className="text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors duration-300">
                  {card.summary}
                </p>

                {/* Published At Date */}
                {card.published_at && (
                  <div className="mt-3 text-sm text-gray-500">
                    <span className="font-medium">Published:</span>{" "}
                    {new Date(card.published_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                )}

                {/* External Links */}
                {card.external_links &&
                  Array.isArray(card.external_links) &&
                  card.external_links.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">Links:</span>{" "}
                        {card.external_links
                          .slice(0, 2)
                          .map((link: any, index: number) => (
                            <span key={index}>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {link.title}
                              </a>
                              {index <
                                Math.min(card.external_links?.length || 0, 2) -
                                  1 && ", "}
                            </span>
                          ))}
                        {card.external_links &&
                          card.external_links.length > 2 && (
                            <span className="text-gray-500">
                              , +{card.external_links.length - 2} more
                            </span>
                          )}
                      </div>
                    </div>
                  )}

                <div
                  className="mt-4 h-1 bg-gradient-to-r from-yec-accent to-yec-primary rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                  aria-hidden="true"
                ></div>
              </div>
            </article>
          ))}
        </div>

        {/* Enhanced CTA Button - More engaging and motivating */}
        <div className="text-center mt-2">
          <button
            onClick={handleScrollToRegistration}
            className="group relative inline-flex items-center justify-center bg-gradient-to-r from-yec-accent to-yec-primary hover:from-yec-primary hover:to-yec-accent text-white font-bold px-10 py-5 rounded-full shadow-2xl transition-all duration-500 text-xl transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-yec-highlight focus:ring-opacity-50 animate-pulse hover:animate-none overflow-hidden"
            aria-label="Register for YEC Day event - Scrolls to registration form"
            aria-describedby="cta-description"
          >
            {/* Shimmer effect */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
              aria-hidden="true"
            ></div>

            {/* Button content */}
            <span className="relative z-10 flex items-center space-x-2">
              <span>ลงทะเบียน!!</span>
              <svg
                className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </span>
          </button>

          {/* Motivational text below button */}
          <p
            id="cta-description"
            className="text-yec-primary font-medium mt-3 text-sm animate-bounce"
            aria-live="polite"
          >
            <span className="inline-block animate-bounce" aria-hidden="true">
              🚀
            </span>
            <span className="sr-only">Rocket emoji indicating urgency</span>
            Don&apos;t miss this opportunity! Limited spots available
          </p>
        </div>
      </div>
    </section>
  );
}
