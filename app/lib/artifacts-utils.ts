import { promises as fs } from "fs";
import path from "path";

/**
 * Save an artifact to the artifacts directory
 */
export async function saveArtifact(
  artifactType: string,
  data: any,
  timestamp?: string,
): Promise<string> {
  try {
    const ts =
      timestamp || new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const artifactsDir = path.join(
      process.cwd(),
      "artifacts",
      "admin-delete",
      ts,
    );

    // Ensure directory exists
    await fs.mkdir(artifactsDir, { recursive: true });

    const filePath = path.join(artifactsDir, `${artifactType}.json`);
    const content = JSON.stringify(data, null, 2);

    await fs.writeFile(filePath, content, "utf8");

    console.log(`[admin.delete] Artifact saved: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error("[admin.delete] Failed to save artifact:", error);
    throw error;
  }
}

/**
 * Get the artifacts directory path for a specific timestamp
 */
export function getArtifactsDir(timestamp?: string): string {
  const ts =
    timestamp || new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return path.join(process.cwd(), "artifacts", "admin-delete", ts);
}

/**
 * Format timestamp for directory naming
 */
export function formatTimestampForDir(date: Date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}
