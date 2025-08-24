// U.S. phone number validation utilities

export const formatPhoneNumber = (value: string | undefined | null): string => {
  // Handle null/undefined values
  if (!value) {
    return '';
  }
  
  // Remove all non-digit characters
  const phoneNumber = value.replace(/\D/g, '');
  
  // Handle 11-digit numbers with country code (1 + 10 digits)
  // This fixes the issue where 18187958204 was showing as (181) 879-5820
  // instead of (818) 795-8204
  if (phoneNumber.length === 11 && phoneNumber.startsWith('1')) {
    const tenDigitNumber = phoneNumber.slice(1); // Remove country code
    return `(${tenDigitNumber.slice(0, 3)}) ${tenDigitNumber.slice(3, 6)}-${tenDigitNumber.slice(6, 10)}`;
  }
  
  // Handle 10-digit numbers (standard US format)
  if (phoneNumber.length === 10) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  } else if (phoneNumber.length >= 6) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6)}`;
  } else if (phoneNumber.length >= 3) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  } else {
    return phoneNumber;
  }
};

export const validateUSPhoneNumber = (phoneNumber: string): { isValid: boolean; error?: string } => {
  // Remove all non-digit characters for validation
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Check if it's empty
  if (!digitsOnly) {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  // Check if it has exactly 10 digits (U.S. format without country code)
  // OR 11 digits starting with 1 (country code + 10 digits)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    // Valid 11-digit format with country code
    return { isValid: true };
  } else if (digitsOnly.length === 10) {
    // Valid 10-digit format
    return { isValid: true };
  } else if (digitsOnly.length < 10) {
    return { isValid: false, error: `Phone number too short. Need ${10 - digitsOnly.length} more digit${10 - digitsOnly.length === 1 ? '' : 's'}` };
  } else if (digitsOnly.length > 11) {
    return { isValid: false, error: 'Phone number too long. Maximum 11 digits allowed' };
  } else {
    return { isValid: false, error: 'Phone number must be 10 digits or 11 digits starting with 1' };
  }
};

export const getCleanPhoneNumber = (phoneNumber: string): string => {
  // Return just the digits for API submission
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // If it's 11 digits starting with 1, return as-is with + prefix
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // If it's 10 digits, add +1 prefix
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // For any other length, return with + prefix if it starts with 1
  if (cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // Default: add +1 prefix
  return `+1${cleaned}`;
};

export const normalizePhoneNumber = (phoneNumber: string): string => {
  // Normalize phone number to 10-digit format for consistent processing
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return cleaned.slice(1); // Remove country code, return 10 digits
  }
  
  return cleaned; // Return as-is if already 10 digits
};
