/**
 * Debug Contest Payload - Run in browser console
 * This will show you exactly what's being sent to the backend
 */

console.log(`
🔍 PAYLOAD DEBUGGER - Paste this in browser console:

// Intercept and log the exact payload being sent
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const [url, options] = args;
  
  if (url.includes('/admin/contests') && options?.method === 'POST') {
    console.log('🚀 INTERCEPTING CONTEST CREATION');
    console.log('URL:', url);
    
    let payload;
    try {
      payload = JSON.parse(options.body);
      console.log('📦 FULL PAYLOAD:');
      console.log(JSON.stringify(payload, null, 2));
      
      console.log('🔍 KEY FIELDS CHECK:');
      console.log('contest_type:', payload.contest_type, typeof payload.contest_type);
      console.log('entry_method:', payload.entry_method, typeof payload.entry_method);
      console.log('winner_selection_method:', payload.winner_selection_method);
      console.log('official_rules:', payload.official_rules);
      console.log('sms_templates:', payload.sms_templates);
      
      // Check required fields
      const requiredFields = [
        'name', 'start_time', 'end_time', 'contest_type', 'entry_method',
        'official_rules.eligibility_text', 'official_rules.sponsor_name', 
        'official_rules.prize_value_usd'
      ];
      
      console.log('✅ REQUIRED FIELDS CHECK:');
      requiredFields.forEach(field => {
        const value = field.includes('.') ? 
          field.split('.').reduce((obj, key) => obj?.[key], payload) : 
          payload[field];
        const exists = value !== undefined && value !== null && value !== '';
        console.log(\`   \${exists ? '✅' : '❌'} \${field}: \${exists ? '✓' : 'MISSING'} (\${typeof value})\`);
      });
      
    } catch (e) {
      console.log('❌ Failed to parse payload:', e);
    }
    
    const response = await originalFetch(...args);
    
    if (!response.ok) {
      const errorData = await response.clone().json();
      console.log('❌ ERROR RESPONSE:');
      console.log(JSON.stringify(errorData, null, 2));
    }
    
    return response;
  }
  
  return originalFetch(...args);
};

console.log('✅ Payload debugger installed! Try creating a contest now.');
`);

// Auto-install if in browser
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const [url, options] = args;
    
    if (url.includes('/admin/contests') && options?.method === 'POST') {
      console.log('🚀 INTERCEPTING CONTEST CREATION');
      console.log('URL:', url);
      
      let payload;
      try {
        payload = JSON.parse(options.body);
        console.log('📦 FULL PAYLOAD:');
        console.log(JSON.stringify(payload, null, 2));
        
        console.log('🔍 KEY FIELDS CHECK:');
        console.log('contest_type:', payload.contest_type, typeof payload.contest_type);
        console.log('entry_method:', payload.entry_method, typeof payload.entry_method);
        console.log('winner_selection_method:', payload.winner_selection_method);
        console.log('official_rules:', payload.official_rules);
        console.log('sms_templates:', payload.sms_templates);
        
        // Check required fields
        const requiredFields = [
          'name', 'start_time', 'end_time', 'contest_type', 'entry_method',
          'official_rules.eligibility_text', 'official_rules.sponsor_name', 
          'official_rules.prize_value_usd'
        ];
        
        console.log('✅ REQUIRED FIELDS CHECK:');
        requiredFields.forEach(field => {
          const value = field.includes('.') ? 
            field.split('.').reduce((obj, key) => obj?.[key], payload) : 
            payload[field];
          const exists = value !== undefined && value !== null && value !== '';
          console.log(`   ${exists ? '✅' : '❌'} ${field}: ${exists ? '✓' : 'MISSING'} (${typeof value})`);
        });
        
      } catch (e) {
        console.log('❌ Failed to parse payload:', e);
      }
      
      const response = await originalFetch(...args);
      
      if (!response.ok) {
        const errorData = await response.clone().json();
        console.log('❌ ERROR RESPONSE:');
        console.log(JSON.stringify(errorData, null, 2));
      }
      
      return response;
    }
    
    return originalFetch(...args);
  };
  
  console.log('✅ Payload debugger auto-installed! Try creating a contest now.');
}
