/**
 * Debug Contest Creation - 422 Error Analysis
 * Run this in browser console to debug validation errors
 */

// Copy this function into browser console during testing
function debugContestCreation() {
  console.log('🔍 CONTEST CREATION DEBUGGER');
  console.log('============================');
  
  // Intercept fetch requests to capture the exact payload and response
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const [url, options] = args;
    
    // Only intercept contest creation requests
    if (url.includes('/admin/contests') && options?.method === 'POST') {
      console.log('\n🚀 INTERCEPTED CONTEST CREATION REQUEST');
      console.log('URL:', url);
      console.log('Method:', options.method);
      
      // Parse and log the payload
      let payload;
      try {
        payload = JSON.parse(options.body);
        console.log('\n📦 REQUEST PAYLOAD:');
        console.log(JSON.stringify(payload, null, 2));
        
        // Validate payload structure
        console.log('\n✅ PAYLOAD VALIDATION:');
        validatePayloadStructure(payload);
        
      } catch (e) {
        console.log('❌ Failed to parse request payload:', e);
      }
      
      // Make the actual request
      const response = await originalFetch(...args);
      
      // Log response details
      console.log('\n📡 RESPONSE DETAILS:');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      
      // If it's an error, get the response body
      if (!response.ok) {
        const responseClone = response.clone();
        try {
          const errorData = await responseClone.json();
          console.log('\n❌ ERROR RESPONSE:');
          console.log(JSON.stringify(errorData, null, 2));
          
          // Analyze validation errors
          if (errorData.detail && Array.isArray(errorData.detail)) {
            console.log('\n🔍 VALIDATION ERRORS ANALYSIS:');
            errorData.detail.forEach((error, index) => {
              console.log(`${index + 1}. Field: ${error.loc?.join('.')} | Error: ${error.msg} | Type: ${error.type}`);
            });
          }
          
        } catch (e) {
          console.log('❌ Failed to parse error response:', e);
        }
      } else {
        console.log('✅ Request successful!');
      }
      
      return response;
    }
    
    // For other requests, use original fetch
    return originalFetch(...args);
  };
  
  console.log('✅ Debugger installed! Now try creating a contest.');
}

function validatePayloadStructure(payload) {
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
    'sms_templates.entry_confirmation', 'sms_templates.winner_notification', 'sms_templates.non_winner',
    
    // Official Rules (6)
    'official_rules.eligibility_text', 'official_rules.sponsor_name', 
    'official_rules.start_date', 'official_rules.end_date', 
    'official_rules.prize_value_usd', 'official_rules.terms_url'
  ];
  
  // Helper function to get nested property
  function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }
  
  // Check required fields
  console.log('📋 REQUIRED FIELDS:');
  let missingRequired = [];
  requiredFields.forEach(field => {
    const value = getNestedValue(payload, field);
    const exists = value !== undefined && value !== null && value !== '';
    console.log(`   ${exists ? '✅' : '❌'} ${field}: ${exists ? '✓' : 'MISSING'}`);
    if (!exists) missingRequired.push(field);
  });
  
  // Check data types
  console.log('\n🔢 DATA TYPE VALIDATION:');
  
  // Check dates
  const dateFields = ['start_time', 'end_time', 'official_rules.start_date', 'official_rules.end_date'];
  dateFields.forEach(field => {
    const value = getNestedValue(payload, field);
    if (value) {
      const isValidDate = !isNaN(Date.parse(value));
      console.log(`   ${isValidDate ? '✅' : '❌'} ${field}: ${isValidDate ? 'Valid ISO date' : 'Invalid date format'}`);
    }
  });
  
  // Check numbers
  const numberFields = ['minimum_age', 'max_entries_per_person', 'total_entry_limit', 'official_rules.prize_value_usd'];
  numberFields.forEach(field => {
    const value = getNestedValue(payload, field);
    if (value !== undefined && value !== null) {
      const isNumber = typeof value === 'number' && !isNaN(value);
      console.log(`   ${isNumber ? '✅' : '❌'} ${field}: ${isNumber ? 'Valid number' : 'Invalid number'} (${typeof value})`);
    }
  });
  
  // Check enums
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
  
  // Check SMS templates structure
  console.log('\n📱 SMS TEMPLATES:');
  if (payload.sms_templates) {
    const templates = ['entry_confirmation', 'winner_notification', 'non_winner'];
    templates.forEach(template => {
      const value = payload.sms_templates[template];
      const exists = value !== undefined && value !== null;
      const validLength = exists && value.length <= 1600;
      console.log(`   ${exists && validLength ? '✅' : '❌'} sms_templates.${template}: ${exists ? (validLength ? 'Valid' : 'Too long (>1600 chars)') : 'Missing'}`);
    });
  } else {
    console.log('   ❌ sms_templates object missing');
  }
  
  // Check official_rules structure
  console.log('\n📋 OFFICIAL RULES:');
  if (payload.official_rules) {
    const rules = ['eligibility_text', 'sponsor_name', 'start_date', 'end_date', 'prize_value_usd', 'terms_url'];
    rules.forEach(rule => {
      const value = payload.official_rules[rule];
      const exists = value !== undefined && value !== null && value !== '';
      console.log(`   ${exists ? '✅' : '❌'} official_rules.${rule}: ${exists ? '✓' : 'Missing'}`);
    });
  } else {
    console.log('   ❌ official_rules object missing');
  }
  
  // Summary
  console.log('\n📊 VALIDATION SUMMARY:');
  console.log(`   Required fields missing: ${missingRequired.length}`);
  if (missingRequired.length > 0) {
    console.log(`   Missing: ${missingRequired.join(', ')}`);
  }
}

// Usage instructions
console.log(`
🔧 USAGE INSTRUCTIONS:
======================

1. Open browser dev tools (F12)
2. Go to Console tab
3. Paste this entire script and press Enter
4. Run: debugContestCreation()
5. Try creating a contest
6. Check console for detailed analysis

The debugger will intercept the request and show:
- Complete request payload
- Validation errors with field details
- Data type issues
- Missing required fields
- Enum validation problems
`);

// Auto-run if in browser
if (typeof window !== 'undefined') {
  debugContestCreation();
}
