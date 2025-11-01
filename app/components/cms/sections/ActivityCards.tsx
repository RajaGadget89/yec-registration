"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";

type ActivityCardsProps = {
  title?: string;
  content?: any;
};

interface Activity {
  id: string;
  card_slug: string;
  title: string;
  summary: string;
  image_url?: string;
  icon_emoji?: string;
  language: string;
  published_at: string;
  hashtags?: string[];
  external_links?: any[];
}

export default function ActivityCardsSection({
  title,
  content,
}: ActivityCardsProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get configuration from content
  const limit = content?.limit || 6; // Fixed to 6 items
  const pageId = content?.page_id;
  const showTitle = content?.show_title !== false; // Default to true
  const showDescription = content?.show_description !== false; // Default to true
  const showImage = content?.show_image !== false; // Default to true
  const showHashtags = content?.show_hashtags !== false; // Default to true
  const gridCols = content?.grid_cols || "3"; // Default to 3 columns
  const sortBy = content?.sort || "published_at"; // Sort by published_at by default

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append("limit", String(limit));
        params.append("sort", sortBy); // Add sort parameter
        if (pageId) {
          params.append("page_id", pageId);
        }

        const response = await fetch(`/api/cms/activity-cards?${params}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch activities: ${response.status}`);
        }

        const data = await response.json();
        let fetchedActivities = data.activities || [];

        // Ensure we only show 6 items max
        if (fetchedActivities.length > 6) {
          fetchedActivities = fetchedActivities.slice(0, 6);
        }

        setActivities(fetchedActivities);
      } catch (err) {
        console.error("Error fetching activities:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch activities",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [limit, pageId, sortBy]);

  // Grid classes based on configuration
  const getGridClass = () => {
    switch (gridCols) {
      case "1":
        return "grid-cols-1";
      case "2":
        return "grid-cols-1 md:grid-cols-2";
      case "3":
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
      case "4":
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
      default:
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    }
  };

  if (loading) {
    return (
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg">
        {showTitle && title && (
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
            {title}
          </h2>
        )}
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yec-primary"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            Loading activities...
          </span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg">
        {showTitle && title && (
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
            {title}
          </h2>
        )}
        <div className="text-center py-12">
          <p className="text-red-600 dark:text-red-400 mb-4">
            Error loading activities
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{error}</p>
        </div>
      </section>
    );
  }

  if (activities.length === 0) {
    return (
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg">
        {showTitle && title && (
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
            {title}
          </h2>
        )}
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            No activities available.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-yec-primary mb-4">
            {title || "Activities"}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Explore our exciting activities and events
          </p>
        </div>

        {/* Activities List */}
        {activities.length > 0 ? (
          <div className="relative">
            {/* View All Activities Button - Top Right */}
            <div className="absolute top-0 right-0 -mt-12">
              <Link
                href="/activities"
                className="group inline-flex items-center justify-center bg-gradient-to-r from-yec-primary to-yec-accent hover:from-yec-accent hover:to-yec-primary text-white font-medium px-4 py-2 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-yec-primary focus:ring-opacity-50"
                aria-label="View all activities"
              >
                <Calendar className="h-4 w-4 mr-1" />
                <span className="text-sm">View All Activities</span>
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg">
              <div className={`grid ${getGridClass()} gap-6`}>
                {activities.map((activity) => (
                  <Link
                    key={activity.id}
                    href={`/activities/${activity.card_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                  >
                    {showImage && activity.image_url && (
                      <div className="aspect-video bg-gradient-to-br from-yec-primary/10 to-yec-accent/10 flex items-center justify-center overflow-hidden relative">
                        <Image
                          src={activity.image_url}
                          alt={activity.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}

                    {!activity.image_url && showImage && (
                      <div className="aspect-video bg-gradient-to-br from-yec-primary/10 to-yec-accent/10 flex items-center justify-center">
                        {activity.icon_emoji ? (
                          <div className="text-4xl">{activity.icon_emoji}</div>
                        ) : (
                          <div className="text-4xl">📅</div>
                        )}
                      </div>
                    )}

                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-yec-primary transition-colors duration-200 line-clamp-2">
                        {activity.icon_emoji && (
                          <span className="mr-2">{activity.icon_emoji}</span>
                        )}
                        {activity.title}
                      </h3>

                      {showDescription && activity.summary && (
                        <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                          {activity.summary}
                        </p>
                      )}

                      {showHashtags &&
                        activity.hashtags &&
                        activity.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {activity.hashtags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yec-primary/10 text-yec-primary"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <span className="capitalize">{activity.language}</span>
                        {activity.published_at && (
                          <span>
                            {new Date(
                              activity.published_at,
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg">
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No activities available.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
