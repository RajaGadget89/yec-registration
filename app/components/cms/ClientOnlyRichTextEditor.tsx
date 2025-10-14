"use client";

import { useState, useEffect } from "react";
import RichTextEditor from "./RichTextEditor";

interface ClientOnlyRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function ClientOnlyRichTextEditor(
  props: ClientOnlyRichTextEditorProps,
) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div
        className={`border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 ${props.className || ""}`}
      >
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="text-gray-500 dark:text-gray-400">
            Loading editor...
          </div>
        </div>
      </div>
    );
  }

  return <RichTextEditor {...props} />;
}
