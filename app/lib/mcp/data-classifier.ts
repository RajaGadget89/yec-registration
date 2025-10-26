export type Sensitivity = "public" | "sensitive";

export function classifyContentType(typeKey: string): Sensitivity {
  const publicTypes = new Set(["faq", "activities", "news", "pages"]);
  if (publicTypes.has(typeKey)) return "public";
  return "sensitive";
}
