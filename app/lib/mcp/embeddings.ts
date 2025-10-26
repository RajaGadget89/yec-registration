import { pipeline } from "@xenova/transformers";

let embedder: any = null;

/**
 * Initialize and return the embedding model
 * Using multilingual-e5-base for better Thai language support
 */
export async function getEmbedder() {
  if (!embedder) {
    console.log("🔄 Loading multilingual-e5-base model...");
    embedder = await pipeline(
      "feature-extraction",
      "Xenova/multilingual-e5-base",
    );
    console.log("✅ Model loaded successfully!");
  }
  return embedder;
}

/**
 * Generate embedding for search queries
 * @param text - The query text to embed
 * @returns 768-dimensional embedding vector
 */
export async function generateQueryEmbedding(text: string): Promise<number[]> {
  const pipe = await getEmbedder();
  const preprocessed = preprocessThaiText(text);

  // IMPORTANT: E5 models require "query:" prefix for queries
  const input = `query: ${preprocessed}`;

  console.log(`Generating query embedding for: "${text.substring(0, 50)}..."`);

  const output: any = await pipe(input, {
    pooling: "mean",
    normalize: true,
  });

  const embedding = Array.from(output.data) as number[];
  console.log(`✅ Generated ${embedding.length}-dimensional embedding`);

  return embedding;
}

/**
 * Generate embedding for documents/content (for indexing)
 * @param text - The document text to embed
 * @returns 768-dimensional embedding vector
 */
export async function generateDocumentEmbedding(
  text: string,
): Promise<number[]> {
  const pipe = await getEmbedder();
  const preprocessed = preprocessThaiText(text);

  // IMPORTANT: E5 models require "passage:" prefix for documents
  const input = `passage: ${preprocessed}`;

  const output: any = await pipe(input, {
    pooling: "mean",
    normalize: true,
  });

  return Array.from(output.data);
}

// Keep backward compatibility
export async function generateEmbedding768(text: string): Promise<number[]> {
  console.warn(
    "⚠️  generateEmbedding768 is deprecated. Use generateDocumentEmbedding() instead.",
  );
  return generateDocumentEmbedding(text);
}

export async function generateEmbedding384(text: string): Promise<number[]> {
  return await generateDocumentEmbedding(text);
}

/**
 * Enhanced Thai text preprocessing
 * Handles Unicode normalization, HTML entities, and whitespace
 */
function preprocessThaiText(text: string): string {
  if (!text) return "";

  // 1. Normalize Unicode characters (NFC normalization)
  let processed = text.normalize("NFC");

  // 2. Decode HTML entities
  processed = processed
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'");

  // 3. Normalize whitespace
  processed = processed.replace(/\s+/g, " ").trim();

  // 4. Remove zero-width characters
  processed = processed.replace(/[\u200B-\u200D\uFEFF]/g, "");

  // 5. Remove control characters
  processed = processed.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

  return processed;
}

export function chunkTextForEmbedding(input: string, maxChars = 350): string[] {
  // Preprocess Thai text before chunking
  const processedText = preprocessThaiText(input);

  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < processedText.length) {
    const end = Math.min(cursor + maxChars, processedText.length);
    chunks.push(processedText.slice(cursor, end));
    cursor = end;
  }
  return chunks;
}
