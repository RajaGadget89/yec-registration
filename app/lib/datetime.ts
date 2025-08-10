export const APP_TZ = "Asia/Bangkok";
export const APP_LOCALE = "en-GB"; // Using en-GB for consistent date formatting

export function formatDate(dateInput: string | number | Date, withTime = false) {
  const d = new Date(dateInput);
  const opts: Intl.DateTimeFormatOptions = withTime
    ? { 
        year: "numeric", 
        month: "2-digit", 
        day: "2-digit", 
        hour: "2-digit", 
        minute: "2-digit", 
        hour12: false, 
        timeZone: APP_TZ 
      }
    : { 
        year: "numeric", 
        month: "2-digit", 
        day: "2-digit", 
        timeZone: APP_TZ 
      };
  return new Intl.DateTimeFormat(APP_LOCALE, opts).format(d);
}

export function formatDateTime(dateInput: string | number | Date) {
  return formatDate(dateInput, true);
}

export function formatDateOnly(dateInput: string | number | Date) {
  return formatDate(dateInput, false);
}
