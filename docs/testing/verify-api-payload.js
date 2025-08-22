/**
 * API Payload Verification Script
 * Use this in browser console to verify API payloads during manual testing
 */

// Copy this function into browser console during testing
function verifyContestPayload(payload) {
  console.log('🔍 CONTEST PAYLOAD VERIFICATION');
  console.log('===============================');
  
  const requiredFields = [
    'name', 'start_time', 'end_time', 
    'official_rules.eligibility_text', 
    'official_rules.sponsor_name', 
    'official_rules.prize_value_usd'
  ];
  
  const allFields = [
    // Basic Information (8)
    'name', 'description', 'location', 'prize_description', 'start_time', 'end_time',
    
    // Advanced Options (10)
    'contest_type', 'entry_method', 'winner_selection_method', 'minimum_age',
    'max_entries_per_person', 'total_entry_limit', 'consolation_offer', 
    'geographic_restrictions', 'contest_tags', 'promotion_channels',
    
    // SMS Templates (3)
    'sms_templates', 'sms_templates.entry_confirmation', 
    'sms_templates.winner_notification', 'sms_templates.non_winner',
    
    // Official Rules (6)
    'official_rules', 'official_rules.eligibility_text', 'official_rules.sponsor_name', 
    'official_rules.start_date', 'official_rules.end_date', 
    'official_rules.prize_value_usd', 'official_rules.terms_url'
  ];
  
  // Helper function to get nested property
  function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }
  
  // Check required fields
  console.log('\n✅ REQUIRED FIELDS:');
  let missingRequired = [];
  requiredFields.forEach(field => {
    const value = getNestedValue(payload, field);
    const exists = value !== undefined && value !== null && value !== '';
    console.log(`   ${exists ? '✅' : '❌'} ${field}: ${exists ? '✓' : 'MISSING'}`);
    if (!exists) missingRequired.push(field);
  });
  
  // Check all fields
  console.log('\n📋 ALL FIELDS STATUS:');
  let presentFields = [];
  let missingFields = [];
  
  allFields.forEach(field => {
    const value = getNestedValue(payload, field);
    const exists = value !== undefined && value !== null;
    if (exists) {
      presentFields.push(field);
      console.log(`   ✅ ${field}: ${typeof value} ${Array.isArray(value) ? `(${value.length} items)` : ''}`);
    } else {
      missingFields.push(field);
      console.log(`   ⚪ ${field}: not provided`);
    }
  });
  
  // Validate enum values
  console.log('\n🎯 ENUM VALIDATION:');
  const enums = {
    contest_type: ['general', 'sweepstakes', 'instant_win'],
    entry_method: ['sms', 'email', 'web_form'],
    winner_selection_method: ['random', 'scheduled', 'instant']
  };
  
  Object.entries(enums).forEach(([field, validValues]) => {
    const value = payload[field];
    if (value) {
      const isValid = validValues.includes(value);
      console.log(`   ${isValid ? '✅' : '❌'} ${field}: "${value}" ${isValid ? '✓' : `(must be: ${validValues.join(', ')})`}`);
    }
  });
  
  // Validate numbers
  console.log('\n🔢 NUMBER VALIDATION:');
  const numberFields = ['minimum_age', 'max_entries_per_person', 'total_entry_limit', 'official_rules.prize_value_usd'];
  numberFields.forEach(field => {
    const value = getNestedValue(payload, field);
    if (value !== undefined && value !== null) {
      const isNumber = typeof value === 'number' && !isNaN(value);
      console.log(`   ${isNumber ? '✅' : '❌'} ${field}: ${value} ${isNumber ? '✓' : '(not a valid number)'}`);
      
      // Special validations
      if (field === 'minimum_age' && isNumber) {
        const validAge = value >= 13 && value <= 100;
        console.log(`   ${validAge ? '✅' : '❌'} minimum_age range: ${validAge ? '✓' : '(must be 13-100)'}`);
      }
    }
  });
  
  // Summary
  console.log('\n📊 SUMMARY:');
  console.log(`   Total fields: ${allFields.length}`);
  console.log(`   Present: ${presentFields.length}`);
  console.log(`   Missing: ${missingFields.length}`);
  console.log(`   Required missing: ${missingRequired.length}`);
  
  const isValid = missingRequired.length === 0;
  console.log(`\n${isValid ? '✅' : '❌'} PAYLOAD STATUS: ${isValid ? 'VALID' : 'INVALID'}`);
  
  if (!isValid) {
    console.log('\n❌ ISSUES TO FIX:');
    missingRequired.forEach(field => {
      console.log(`   - Missing required field: ${field}`);
    });
  }
  
  return {
    isValid,
    presentFields,
    missingFields,
    missingRequired,
    payload
  };
}

// Usage instructions
console.log(`
🔧 USAGE INSTRUCTIONS:
======================

1. Open browser dev tools (F12)
2. Go to Network tab
3. Submit a contest form
4. Find the POST request to /admin/contests
5. Copy the request payload
6. In console, run:
   
   verifyContestPayload(YOUR_PAYLOAD_HERE)

Example:
   const payload = { name: "Test", start_time: "2025-01-01T10:00:00Z", ... };
   verifyContestPayload(payload);
`);

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { verifyContestPayload };
}
