"use client";
import { useEffect, useState } from "react";

export default function ClientRelativeTime({ iso }: { iso: string }) {
  const [text, setText] = useState<string>("");
  
  useEffect(() => {
    const d = new Date(iso).getTime();
    const days = Math.floor((Date.now() - d) / 86400000);
    if (days >= 1) setText(`${days}d ago`);
  }, [iso]);
  
  if (!text) return null; // server renders empty, client fills → no mismatch
  return <span className="text-xs text-gray-500">{text}</span>;
}
