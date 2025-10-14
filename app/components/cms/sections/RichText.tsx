"use client";

type RichTextProps = {
  title?: string;
  content?: any;
};

export default function RichTextSection({ title, content }: RichTextProps) {
  const body = typeof content?.body === "string" ? content.body : undefined;
  return (
    <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg">
      {title && (
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          {title}
        </h2>
      )}
      {body ? (
        <div
          className="prose dark:prose-invert max-w-none prose-lg prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-yec-primary hover:prose-a:text-yec-accent prose-strong:text-gray-900 dark:prose-strong:text-white"
          dangerouslySetInnerHTML={{ __html: body }}
        />
      ) : (
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          No content available.
        </p>
      )}
    </section>
  );
}
