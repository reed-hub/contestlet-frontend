/**
 * Simple and reliable timezone conversion utilities
 * 
 * GOAL:
 * - User enters time in their preferred timezone (e.g., 7:15 PM EDT)
 * - Frontend converts to UTC for backend storage
 * - Backend sends UTC, frontend converts back to user's timezone for display
 */

/**
 * Convert datetime-local input FROM user timezone TO UTC
 * @param datetimeLocal - "2025-08-20T19:15" (represents 7:15 PM in user's timezone)
 * @param timezone - "America/New_York" (user's preferred timezone)
 * @returns "2025-08-20T23:15:00.000Z" (UTC equivalent)
 */
export function userTimezoneToUTC(datetimeLocal: string, timezone: string): string {
  if (!datetimeLocal || !timezone) return '';
  
  console.log('🔄 Converting user timezone → UTC');
  console.log('  Input:', datetimeLocal, 'in', timezone);
  
  try {
    // Parse the input components
    const [date, time] = datetimeLocal.split('T');
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    
    // Key insight: We need to create a Date object that represents
    // the specified time IN THE USER'S TIMEZONE, then convert to UTC
    
    // Method 1: Use Intl.DateTimeFormat with inverse operations
    // Create a test date to determine the timezone offset
    const testDate = new Date(year, month - 1, day, 12, 0, 0); // noon on target date
    
    // Format this test date in both UTC and user timezone
    const utcString = testDate.toLocaleString('sv-SE', { timeZone: 'UTC' });
    const userString = testDate.toLocaleString('sv-SE', { timeZone: timezone });
    
    // Parse back to get the offset
    const utcMs = new Date(utcString).getTime();
    const userMs = new Date(userString).getTime();
    const offsetMs = utcMs - userMs;
    
    // Now apply this offset to our target time
    const targetLocal = new Date(year, month - 1, day, hours, minutes, 0);
    const targetUtc = new Date(targetLocal.getTime() + offsetMs);
    
    console.log('  Test offset (ms):', offsetMs);
    console.log('  Target local:', targetLocal.toISOString());
    console.log('  Target UTC:', targetUtc.toISOString());
    
    return targetUtc.toISOString();
    
  } catch (error) {
    console.error('Error in timezone conversion:', error);
    return new Date(datetimeLocal + ':00Z').toISOString();
  }
}

/**
 * Convert UTC FROM backend TO user timezone for display
 * @param utcIsoString - "2025-08-20T23:15:00Z" (UTC from backend)
 * @param timezone - "America/New_York" (user's preferred timezone)
 * @returns "2025-08-20T19:15" (for datetime-local input)
 */
export function utcToUserTimezone(utcIsoString: string, timezone: string): string {
  if (!utcIsoString || !timezone) return '';
  
  console.log('🔄 Converting UTC → user timezone');
  console.log('  Input:', utcIsoString, 'to', timezone);
  
  try {
    const utcDate = new Date(utcIsoString);
    
    // Use Intl.DateTimeFormat to get the date in the user's timezone
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const formatted = formatter.format(utcDate);
    // Format is "2025-08-20 19:15:00", we need "2025-08-20T19:15"
    const result = formatted.slice(0, 16).replace(' ', 'T');
    
    console.log('  Formatted result:', result);
    return result;
    
  } catch (error) {
    console.error('Error in UTC to timezone conversion:', error);
    return utcIsoString.slice(0, 16);
  }
}

/**
 * Format UTC time for display in user's timezone
 * @param utcIsoString - UTC time from backend
 * @param timezone - User's timezone
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted string for display
 */
export function formatUtcInUserTimezone(
  utcIsoString: string, 
  timezone: string, 
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!utcIsoString || !timezone) return '';
  
  const utcDate = new Date(utcIsoString);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options
  };
  
  return new Intl.DateTimeFormat('en-US', defaultOptions).format(utcDate);
}
