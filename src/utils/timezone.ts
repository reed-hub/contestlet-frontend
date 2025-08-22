/**
 * Timezone utility functions for handling admin timezone preferences
 * and universal time conversion between frontend and backend
 */

// Backend timezone interface
export interface BackendTimezone {
  timezone: string;
  display_name: string;
  current_time: string;
  utc_offset: string;
  is_dst: boolean;
}

// Fallback timezone list (used if backend is unavailable)
export const FALLBACK_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (AZ)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AK)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HI)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
];

// Cache for backend timezones
let cachedBackendTimezones: BackendTimezone[] | null = null;

// Local storage keys
const ADMIN_TIMEZONE_KEY = 'admin_timezone';
const ADMIN_TIMEZONE_AUTO_KEY = 'admin_timezone_auto_detect';

// Backend API functions
const getApiBaseUrl = () => {
  return process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
};

/**
 * Fetch supported timezones from backend
 * @returns Promise<BackendTimezone[]>
 */
export async function fetchSupportedTimezones(): Promise<BackendTimezone[]> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/admin/profile/timezones`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    cachedBackendTimezones = data.timezones || [];
    return cachedBackendTimezones || [];
  } catch (error) {
    console.warn('Failed to fetch timezones from backend, using fallback:', error);
    return FALLBACK_TIMEZONES.map(tz => ({
      timezone: tz.value,
      display_name: tz.label,
      current_time: new Date().toISOString(),
      utc_offset: '+00:00',
      is_dst: false
    }));
  }
}

/**
 * Get cached timezones or fetch from backend
 * @returns Promise<BackendTimezone[]>
 */
export async function getSupportedTimezones(): Promise<BackendTimezone[]> {
  if (cachedBackendTimezones) {
    return cachedBackendTimezones;
  }
  return await fetchSupportedTimezones();
}

/**
 * Save admin timezone preferences to backend
 * @param timezone - IANA timezone identifier
 * @param autoDetect - Whether to auto-detect timezone
 * @param adminToken - Admin JWT token
 * @returns Promise<boolean> - Success status
 */
export async function saveAdminTimezoneToBackend(
  timezone: string, 
  autoDetect: boolean, 
  adminToken: string
): Promise<boolean> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/admin/profile/timezone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        timezone,
        timezone_auto_detect: autoDetect,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Also update localStorage for immediate use
    setAdminTimezone(timezone, autoDetect);
    return true;
  } catch (error) {
    console.error('Failed to save timezone to backend:', error);
    // Fallback to localStorage only
    setAdminTimezone(timezone, autoDetect);
    return false;
  }
}

/**
 * Load admin timezone preferences from backend
 * @param adminToken - Admin JWT token
 * @returns Promise<{timezone: string, autoDetect: boolean} | null>
 */
export async function loadAdminTimezoneFromBackend(
  adminToken: string
): Promise<{timezone: string, autoDetect: boolean} | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/admin/profile/timezone`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No preferences set yet, use defaults
        return null;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    // Update localStorage to match backend
    setAdminTimezone(data.timezone, data.timezone_auto_detect);
    
    return {
      timezone: data.timezone,
      autoDetect: data.timezone_auto_detect,
    };
  } catch (error) {
    console.warn('Failed to load timezone from backend, using localStorage:', error);
    return {
      timezone: getAdminTimezone(),
      autoDetect: isAdminTimezoneAutoDetected(),
    };
  }
}

/**
 * Get the admin's preferred timezone from localStorage
 * Falls back to browser timezone if not set
 */
export function getAdminTimezone(): string {
  const storedTimezone = localStorage.getItem(ADMIN_TIMEZONE_KEY);
  const autoDetect = localStorage.getItem(ADMIN_TIMEZONE_AUTO_KEY) === 'true';
  
  if (storedTimezone && !autoDetect) {
    return storedTimezone;
  }
  
  // Auto-detect browser timezone
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Set the admin's preferred timezone
 */
export function setAdminTimezone(timezone: string, autoDetect: boolean = false): void {
  localStorage.setItem(ADMIN_TIMEZONE_KEY, timezone);
  localStorage.setItem(ADMIN_TIMEZONE_AUTO_KEY, autoDetect.toString());
}

/**
 * Check if admin is using auto-detected timezone
 */
export function isAdminTimezoneAutoDetected(): boolean {
  return localStorage.getItem(ADMIN_TIMEZONE_AUTO_KEY) === 'true';
}

/**
 * Get the browser's detected timezone
 */
export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Convert a datetime-local input value (in admin timezone) to UTC ISO string for API
 * @param datetimeLocalValue - Value from datetime-local input (YYYY-MM-DDTHH:mm)
 * @param adminTimezone - Admin's preferred timezone
 * @returns UTC ISO string for API
 */
export function datetimeLocalToUTC(datetimeLocalValue: string, adminTimezone?: string): string {
  if (!datetimeLocalValue) return '';
  
  const timezone = adminTimezone || getAdminTimezone();
  
  console.log('🔄 Converting FROM user timezone TO UTC:');
  console.log('  User input:', datetimeLocalValue, '(time in', timezone + ')');
  
  try {
    // Parse the input
    const [date, time] = datetimeLocalValue.split('T');
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    
    // PROVEN METHOD: Use Intl.DateTimeFormat with inverse calculation
    // Step 1: Create what we think the UTC time should be
    const candidateUtc = new Date(Date.UTC(year, month - 1, day, hours, minutes));
    
    // Step 2: See what this UTC time displays as in the user's timezone
    const displayInUserTz = new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(candidateUtc);
    
    // Step 3: Parse what it displayed and calculate the difference
    const [displayDate, displayTime] = displayInUserTz.split(' ');
    const [displayYear, displayMonth, displayDay] = displayDate.split('-').map(Number);
    const [displayHours, displayMinutes] = displayTime.split(':').map(Number);
    
    // Step 4: Calculate the correction needed
    const inputMs = new Date(year, month - 1, day, hours, minutes).getTime();
    const displayMs = new Date(displayYear, displayMonth - 1, displayDay, displayHours, displayMinutes).getTime();
    const correctionMs = inputMs - displayMs;
    
    // Step 5: Apply the correction
    const finalUtc = new Date(candidateUtc.getTime() + correctionMs);
    
    console.log('  Input time components:', { year, month, day, hours, minutes });
    console.log('  Candidate UTC:', candidateUtc.toISOString());
    console.log('  Displays in', timezone, 'as:', displayInUserTz);
    console.log('  Correction needed (ms):', correctionMs);
    console.log('  Final UTC result:', finalUtc.toISOString());
    
    return finalUtc.toISOString();
    
  } catch (error) {
    console.error('Error converting datetime to UTC:', error);
    return new Date(datetimeLocalValue + ':00Z').toISOString();
  }
}

// Removed unused timezone conversion helper functions
// Frontend no longer does timezone conversion - backend handles it

/**
 * Convert UTC ISO string from API to datetime-local input value (in admin timezone)
 * @param utcIsoString - UTC ISO string from API
 * @param adminTimezone - Admin's preferred timezone
 * @returns Value for datetime-local input (YYYY-MM-DDTHH:mm)
 */
export function utcToDatetimeLocal(utcIsoString: string, adminTimezone?: string): string {
  if (!utcIsoString) return '';
  
  const timezone = adminTimezone || getAdminTimezone();
  
  console.log('🔄 Converting UTC → user timezone:');
  console.log('  Input UTC string:', utcIsoString);
  console.log('  Target timezone:', timezone);
  
  // CRITICAL FIX: Backend sends UTC times WITHOUT 'Z' suffix
  // JavaScript interprets "2025-08-21T05:35:00" as LOCAL time
  // We must add 'Z' suffix to treat it as UTC
  const utcString = utcIsoString.endsWith('Z') ? utcIsoString : utcIsoString + 'Z';
  const utcDate = new Date(utcString);
  
  console.log('  Fixed UTC string:', utcString);
  console.log('  Parsed as UTC:', utcDate.toISOString());
  
  // Convert to admin's timezone
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
  // Formatter gives us "2024-01-15 14:30:00", we need "2024-01-15T14:30"
  const result = formatted.slice(0, 16).replace(' ', 'T');
  
  console.log('  Formatted in timezone:', formatted);
  console.log('  Final result:', result);
  
  return result;
}

/**
 * Format a UTC ISO string for display in admin's timezone
 * @param utcIsoString - UTC ISO string from API
 * @param adminTimezone - Admin's preferred timezone
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string in admin's timezone
 */
export function formatDateInAdminTimezone(
  utcIsoString: string, 
  adminTimezone?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!utcIsoString) return '';
  
  const timezone = adminTimezone || getAdminTimezone();
  
  // CRITICAL FIX: Backend sends UTC times WITHOUT 'Z' suffix
  // Add 'Z' to ensure JavaScript treats it as UTC
  const utcString = utcIsoString.endsWith('Z') ? utcIsoString : utcIsoString + 'Z';
  const utcDate = new Date(utcString);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  };
  
  return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(utcDate);
}

/**
 * Safely parse a UTC datetime string from backend (with or without 'Z' suffix)
 * @param utcString - UTC datetime string from backend
 * @returns Date object parsed as UTC
 */
export function parseBackendUtcDate(utcString: string): Date {
  if (!utcString) return new Date();
  
  // Ensure the string is treated as UTC by adding 'Z' if missing
  const utcStringWithZ = utcString.endsWith('Z') ? utcString : utcString + 'Z';
  return new Date(utcStringWithZ);
}

/**
 * Get timezone display name for a given timezone identifier
 * @param timezone - IANA timezone identifier
 * @returns Human-readable timezone name
 */
export function getTimezoneDisplayName(timezone: string): string {
  const found = FALLBACK_TIMEZONES.find((tz: { value: string; label: string }) => tz.value === timezone);
  if (found) return found.label;
  
  // Fallback: use Intl to get a reasonable display name
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'long'
    });
    const parts = formatter.formatToParts(now);
    const timezonePart = parts.find(part => part.type === 'timeZoneName');
    return timezonePart ? `${timezone} (${timezonePart.value})` : timezone;
  } catch {
    return timezone;
  }
}

/**
 * Get timezone abbreviation for current time (e.g., EST, EDT, PST, PDT)
 * @param timezone - IANA timezone identifier
 * @param date - Date to get abbreviation for (defaults to now)
 * @returns Timezone abbreviation
 */
export function getTimezoneAbbreviation(timezone: string, date: Date = new Date()): string {
  try {
    // Use Intl.DateTimeFormat to get the timezone abbreviation
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    
    const parts = formatter.formatToParts(date);
    const timeZonePart = parts.find(part => part.type === 'timeZoneName');
    
    return timeZonePart?.value || timezone.split('/').pop()?.replace('_', ' ') || timezone;
  } catch (error) {
    console.warn('Failed to get timezone abbreviation for', timezone, error);
    return timezone.split('/').pop()?.replace('_', ' ') || timezone;
  }
}

/**
 * Get display name with current abbreviation
 * @param timezone - IANA timezone identifier
 * @returns Display name with abbreviation (e.g., 'Eastern Time (EST)')
 */
export function getTimezoneDisplayNameWithAbbreviation(timezone: string): string {
  const displayName = getTimezoneDisplayName(timezone);
  const abbreviation = getTimezoneAbbreviation(timezone);
  
  // If the display name already contains parentheses, use it as-is
  if (displayName.includes('(') && displayName.includes(')')) {
    return displayName;
  }
  
  // Otherwise, add the abbreviation
  return `${displayName} (${abbreviation})`;
}

/**
 * Validate if a timezone identifier is valid
 * @param timezone - IANA timezone identifier
 * @returns true if valid, false otherwise
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current time in admin's timezone
 * @param adminTimezone - Admin's preferred timezone
 * @returns Date object representing current time
 */
export function getCurrentTimeInAdminTimezone(adminTimezone?: string): Date {
  const timezone = adminTimezone || getAdminTimezone();
  const now = new Date();
  
  // This will give us the current time, but we need to think of it as if it were in the admin's timezone
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const formatted = formatter.format(now);
  return new Date(formatted);
}

/**
 * Helper to check if two dates are the same day in admin's timezone
 * @param date1 - First date (UTC ISO string or Date)
 * @param date2 - Second date (UTC ISO string or Date)
 * @param adminTimezone - Admin's preferred timezone
 * @returns true if same day in admin's timezone
 */
export function isSameDayInAdminTimezone(
  date1: string | Date, 
  date2: string | Date, 
  adminTimezone?: string
): boolean {
  const timezone = adminTimezone || getAdminTimezone();
  
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  return formatter.format(d1) === formatter.format(d2);
}

/**
 * Create default contest dates in admin's timezone
 * @param adminTimezone - Admin's preferred timezone
 * @returns Object with start_date and end_date for datetime-local inputs
 */
export function createDefaultContestDates(adminTimezone?: string): { start_date: string; end_date: string } {
  const timezone = adminTimezone || getAdminTimezone();
  
  // Get current time in admin's timezone
  const now = new Date();
  
  // Tomorrow at 9 AM in admin's timezone
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Next week at 5 PM in admin's timezone  
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  // Convert to admin's timezone and format for datetime-local
  const tomorrowInTz = new Date(tomorrow.toLocaleString('en-US', { timeZone: timezone }));
  tomorrowInTz.setHours(9, 0, 0, 0);
  
  const nextWeekInTz = new Date(nextWeek.toLocaleString('en-US', { timeZone: timezone }));
  nextWeekInTz.setHours(17, 0, 0, 0);
  
  return {
    start_date: tomorrowInTz.toISOString().slice(0, 16),
    end_date: nextWeekInTz.toISOString().slice(0, 16)
  };
}
