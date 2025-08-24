// Test script for phone validation functions
const { formatPhoneNumber, validateUSPhoneNumber, getCleanPhoneNumber } = require('./src/utils/phoneValidation.ts');

// Test cases
const testCases = [
  '(555) 123-4567',
  '+1 (555) 123-4567', 
  '5551234567',
  '+15551234567',
  '(818) 795-8204',
  '+1 (818) 795-8204'
];

console.log('🧪 Testing phone validation functions...\n');

testCases.forEach(testCase => {
  console.log(`Input: "${testCase}"`);
  console.log(`Formatted: "${formatPhoneNumber(testCase)}"`);
  console.log(`Cleaned: "${getCleanPhoneNumber(testCase)}"`);
  console.log(`Valid: ${validateUSPhoneNumber(testCase).isValid}`);
  console.log('---');
});
