"use client";

type HeroProps = {
  title?: string;
  content?: any;
};

export default function HeroSection({ title, content }: HeroProps) {
  const subtitle =
    typeof content?.subtitle === "string" ? content.subtitle : undefined;
  return (
    <section className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8">
      <div className="absolute inset-0 bg-gradient-to-r from-yec-primary/10 via-blue-400/10 to-yec-accent/10" />
      <div className="relative">
        {title && (
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="text-gray-700 dark:text-gray-300">{subtitle}</p>
        )}
      </div>
    </section>
  );
}
