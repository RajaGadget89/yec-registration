"use client";

type RichTextProps = {
  title?: string;
  content?: any;
};

export default function RichTextSection({ title, content }: RichTextProps) {
  const body = typeof content?.body === "string" ? content.body : undefined;
  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      {title && (
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          {title}
        </h3>
      )}
      {body ? (
        <div
          className="prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: body }}
        />
      ) : (
        <p className="text-gray-500 dark:text-gray-400">No content.</p>
      )}
    </section>
  );
}
