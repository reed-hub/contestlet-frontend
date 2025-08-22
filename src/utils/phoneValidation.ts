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
  } else {
    return { isValid: false, error: 'Phone number must be 10 digits or 11 digits starting with 1' };
  }
  
  // Check if first digit is not 0 or 1 (valid area code) - only for 10-digit numbers
  if (digitsOnly.length === 10) {
    if (digitsOnly[0] === '0' || digitsOnly[0] === '1') {
      return { isValid: false, error: 'Invalid area code' };
    }
    
    // Check if fourth digit is not 0 or 1 (valid exchange code)
    if (digitsOnly[3] === '0' || digitsOnly[3] === '1') {
      return { isValid: false, error: 'Invalid exchange code' };
    }
  }
  
  return { isValid: true };
};

export const getCleanPhoneNumber = (phoneNumber: string): string => {
  // Return just the digits for API submission
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // If it's 11 digits starting with 1, return as-is
  // If it's 10 digits, return as-is
  // This preserves the original format for the API
  return cleaned;
};

export const normalizePhoneNumber = (phoneNumber: string): string => {
  // Normalize phone number to 10-digit format for consistent processing
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return cleaned.slice(1); // Remove country code, return 10 digits
  }
  
  return cleaned; // Return as-is if already 10 digits
};
