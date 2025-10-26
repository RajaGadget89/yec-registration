import { notFound } from "next/navigation";
import { Metadata } from "next";
import Image from "next/image";
import TopMenuBar from "../../components/TopMenuBar";
import Footer from "../../components/Footer";

async function fetchActivity(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/cms/activity-cards/${slug}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.activity as any;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Properly decode the slug to handle Thai characters
  const decodedSlug = decodeURIComponent(slug);
  const activity = await fetchActivity(decodedSlug);

  if (!activity) {
    return {
      title: "Activity Not Found",
      description: "The requested activity could not be found.",
    };
  }

  return {
    title: `${activity.title} - YEC Registration`,
    description:
      activity.summary ||
      activity.description ||
      `Learn more about ${activity.title}`,
    openGraph: {
      title: activity.title,
      description:
        activity.summary ||
        activity.description ||
        `Learn more about ${activity.title}`,
      images: activity.image_url ? [activity.image_url] : [],
    },
  };
}

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Properly decode the slug to handle Thai characters
  const decodedSlug = decodeURIComponent(slug);
  const activity = await fetchActivity(decodedSlug);
  if (!activity) return notFound();

  const now = new Date();
  const start = activity.scheduled_at ? new Date(activity.scheduled_at) : null;
  const end = activity.ends_at ? new Date(activity.ends_at) : null;
  const isUpcoming = start && start > now;
  const isLive = start && start <= now && (!end || end >= now);
  const isPast = end && end < now;

  return (
    <main className="min-h-screen">
      <TopMenuBar />
      <div className="max-w-4xl mx-auto px-4 pt-40 pb-10">
        <h1 className="text-3xl font-bold mb-3">
          {activity.icon_emoji && (
            <span className="mr-3">{activity.icon_emoji}</span>
          )}
          {activity.title}
        </h1>
        <div className="flex items-center gap-2 mb-6 text-sm">
          {isUpcoming && (
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              Upcoming
            </span>
          )}
          {isLive && (
            <span className="px-2 py-0.5 rounded bg-green-100 text-green-800">
              Live
            </span>
          )}
          {isPast && (
            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800">
              Past
            </span>
          )}
          {activity.published_at && (
            <span className="text-gray-500">
              Published: {new Date(activity.published_at).toLocaleString()}
            </span>
          )}
        </div>
        {activity.image_url && (
          <Image
            src={activity.image_url}
            alt={activity.title}
            width={800}
            height={400}
            priority
            className="w-full rounded-lg shadow mb-6 object-cover"
          />
        )}
        {activity.summary && (
          <p className="text-lg text-gray-700 mb-4">{activity.summary}</p>
        )}
        {activity.content && (
          <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-yec-primary hover:prose-a:text-yec-accent prose-strong:text-gray-900 dark:prose-strong:text-white">
            <div
              className="text-gray-700 dark:text-gray-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: activity.content }}
            />
          </div>
        )}
        {Array.isArray(activity.external_links) &&
          activity.external_links.length > 0 && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-2">Links</h2>
              <ul className="list-disc pl-5 space-y-1">
                {activity.external_links.map((l: any, i: number) => (
                  <li key={i}>
                    <a
                      className="text-blue-600 underline"
                      href={l.url}
                      target="_blank"
                    >
                      {l.title}
                    </a>
                    {l.description ? ` — ${l.description}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        {Array.isArray(activity.hashtags) && activity.hashtags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {activity.hashtags.map((t: string, i: number) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-sm"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
