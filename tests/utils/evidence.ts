import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import type { Page } from '@playwright/test';

/**
 * Evidence collection utilities for AC1-AC6 test specs.
 * Provides standardized artifact storage for traces, videos, screenshots, API logs, and JSON dumps.
 */

type ACId = 'AC1' | 'AC2' | 'AC3' | 'AC4' | 'AC5' | 'AC6' | 'AC7' | 'AC8' | 'AC9' | 'AC10';

/**
 * Creates a timestamped run directory for the specified AC test.
 * @param acId The AC test identifier
 * @returns Promise resolving to the absolute path of the created directory
 */
export async function makeRunDir(acId: ACId): Promise<string> {
  const timestamp = formatTimestamp();
  const runDir = resolve(process.cwd(), 'artifacts', acId, timestamp);
  
  // Retry up to 2 attempts for directory creation
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await fs.mkdir(runDir, { recursive: true });
      return runDir;
    } catch (error) {
      if (attempt === 2) throw error;
      // Small delay before retry
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  throw new Error('Failed to create run directory after 2 attempts');
}

/**
 * Saves a screenshot of the current page state.
 * @param page The Playwright page object
 * @param runDir The run directory path
 * @param name The filename (without extension)
 */
export async function saveScreenshot(page: Page, runDir: string, name: string): Promise<void> {
  const filename = sanitize(name) + '.png';
  const path = join(runDir, filename);
  
  // Retry up to 2 attempts
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await page.screenshot({ path });
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

/**
 * Saves JSON data to a file with pretty formatting.
 * @param name The filename (without extension)
 * @param data The data to serialize
 * @param runDir The run directory path
 */
export async function saveJson(name: string, data: unknown, runDir: string): Promise<void> {
  const filename = sanitize(name) + '.json';
  const path = join(runDir, filename);
  const content = JSON.stringify(data, null, 2) + '\n';
  
  // Retry up to 2 attempts
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await fs.writeFile(path, content, 'utf8');
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

/**
 * Saves API log data to a file.
 * @param name The filename (without extension)
 * @param payload The API payload to log
 * @param runDir The run directory path
 */
export async function saveApiLog(name: string, payload: unknown, runDir: string): Promise<void> {
  const filename = sanitize(name) + '.json';
  const path = join(runDir, filename);
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    payload
  };
  
  const content = JSON.stringify(logEntry, null, 2) + '\n';
  
  // Retry up to 2 attempts
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await fs.writeFile(path, content, 'utf8');
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

/**
 * Convenience wrapper that creates a run directory and passes it to a callback function.
 * @param acId The AC test identifier
 * @param fn The callback function that receives the run directory context
 * @returns Promise resolving to the callback's return value
 */
export async function withArtifacts<T>(
  acId: ACId,
  fn: (ctx: { runDir: string }) => Promise<T>
): Promise<T> {
  const runDir = await makeRunDir(acId);
  return await fn({ runDir });
}

/**
 * Formats current timestamp as YYYYMMDD-HHmmss.
 * @returns Formatted timestamp string
 */
function formatTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

/**
 * Sanitizes a filename by removing or replacing path-unsafe characters.
 * @param name The original filename
 * @returns Sanitized filename safe for filesystem use
 */
function sanitize(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
}