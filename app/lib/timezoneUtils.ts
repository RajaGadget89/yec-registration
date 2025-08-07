/**
 * Timezone utilities for Thailand (GMT+7)
 */

// Thailand timezone offset in minutes (GMT+7 = 7 * 60 = 420 minutes)
const THAILAND_TIMEZONE_OFFSET = 7 * 60;

/**
 * Get current date and time in Thailand timezone
 * @returns ISO string in Thailand timezone (GMT+7)
 */
export function getThailandTimeISOString(): string {
  const now = new Date();
  const thailandTime = new Date(now.getTime() + (THAILAND_TIMEZONE_OFFSET * 60 * 1000));
  return thailandTime.toISOString();
}

/**
 * Convert UTC date to Thailand timezone
 * @param utcDate - UTC date string or Date object
 * @returns ISO string in Thailand timezone
 */
export function convertUTCToThailandTime(utcDate: string | Date): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  const thailandTime = new Date(date.getTime() + (THAILAND_TIMEZONE_OFFSET * 60 * 1000));
  return thailandTime.toISOString();
}

/**
 * Get current date and time in Thailand timezone as Date object
 * @returns Date object in Thailand timezone
 */
export function getThailandTimeDate(): Date {
  const now = new Date();
  return new Date(now.getTime() + (THAILAND_TIMEZONE_OFFSET * 60 * 1000));
}

/**
 * Format date for display in Thailand timezone
 * @param date - Date to format
 * @returns Formatted date string in Thailand timezone
 */
export function formatThailandTime(date: Date | string): string {
  const thailandDate = typeof date === 'string' ? new Date(date) : date;
  const thailandTime = new Date(thailandDate.getTime() + (THAILAND_TIMEZONE_OFFSET * 60 * 1000));
  
  return thailandTime.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
} 