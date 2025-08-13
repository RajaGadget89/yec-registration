import fs from 'fs';
import path from 'path';
import { supabaseTestClient } from './supabaseTestClient';

/**
 * Save audit artifacts for debugging test failures
 */
export async function saveAuditArtifacts(requestId: string, testName: string): Promise<void> {
  try {
    // Create artifacts directory
    const artifactsDir = path.join(process.cwd(), 'test-artifacts', 'audit', requestId);
    await fs.promises.mkdir(artifactsDir, { recursive: true });

    // Fetch audit logs
    const [accessLogs, eventLogs] = await Promise.all([
      supabaseTestClient.getAccessLogsByRequestId(requestId),
      supabaseTestClient.getEventLogsByCorrelationId(requestId)
    ]);

    // Save JSON files
    await fs.promises.writeFile(
      path.join(artifactsDir, 'access.json'),
      JSON.stringify(accessLogs, null, 2)
    );
    await fs.promises.writeFile(
      path.join(artifactsDir, 'events.json'),
      JSON.stringify(eventLogs, null, 2)
    );

    // Save CSV files
    if (accessLogs.length > 0) {
      const accessCsv = convertToCSV(accessLogs);
      await fs.promises.writeFile(path.join(artifactsDir, 'access.csv'), accessCsv);
    }

    if (eventLogs.length > 0) {
      const eventsCsv = convertToCSV(eventLogs);
      await fs.promises.writeFile(path.join(artifactsDir, 'events.csv'), eventsCsv);
    }

    console.log(`[artifacts] Saved audit artifacts for ${testName} to ${artifactsDir}`);
  } catch (error) {
    console.error(`[artifacts] Failed to save artifacts for ${testName}:`, error);
  }
}

/**
 * Convert array of objects to CSV format
 */
function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ];
  
  return csvRows.join('\n');
}
