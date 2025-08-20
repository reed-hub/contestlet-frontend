// U.S. phone number validation utilities

export const formatPhoneNumber = (value: string | undefined | null): string => {
  // Handle null/undefined values
  if (!value) {
    return '';
  }
  
  // Remove all non-digit characters
  const phoneNumber = value.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX
  if (phoneNumber.length >= 10) {
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
  if (digitsOnly.length !== 10) {
    return { isValid: false, error: 'Phone number must be 10 digits' };
  }
  
  // Check if first digit is not 0 or 1 (valid area code)
  if (digitsOnly[0] === '0' || digitsOnly[0] === '1') {
    return { isValid: false, error: 'Invalid area code' };
  }
  
  // Check if fourth digit is not 0 or 1 (valid exchange code)
  if (digitsOnly[3] === '0' || digitsOnly[3] === '1') {
    return { isValid: false, error: 'Invalid exchange code' };
  }
  
  return { isValid: true };
};

export const getCleanPhoneNumber = (phoneNumber: string): string => {
  // Return just the digits for API submission
  return phoneNumber.replace(/\D/g, '');
};
