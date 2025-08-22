/**
 * Quick 422 Error Debugger - Paste this in browser console
 * This will show you the exact 2 validation errors
 */

// Run this in browser console to see the exact validation errors
console.log(`
🔍 QUICK 422 ERROR DEBUGGER
===========================

Paste this code in browser console and run it:

// Step 1: Intercept the next contest creation request
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const [url, options] = args;
  
  if (url.includes('/admin/contests') && options?.method === 'POST') {
    console.log('🚀 INTERCEPTED CONTEST CREATION');
    
    const response = await originalFetch(...args);
    
    if (response.status === 422) {
      const errorData = await response.clone().json();
      console.log('❌ 422 VALIDATION ERRORS:');
      console.log('=========================');
      
      if (errorData.detail && Array.isArray(errorData.detail)) {
        errorData.detail.forEach((error, index) => {
          console.log(\`\${index + 1}. FIELD: \${error.loc?.join('.')}\`);
          console.log(\`   ERROR: \${error.msg}\`);
          console.log(\`   TYPE: \${error.type}\`);
          console.log(\`   INPUT: \${JSON.stringify(error.input)}\`);
          console.log('   ---');
        });
      }
      
      console.log('FULL ERROR RESPONSE:');
      console.log(JSON.stringify(errorData, null, 2));
    }
    
    return response;
  }
  
  return originalFetch(...args);
};

console.log('✅ Debugger installed! Now try creating the contest again.');

// Step 2: After you see the errors, run this to restore normal fetch
// window.fetch = originalFetch;
`);

// Auto-install if in browser
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const [url, options] = args;
    
    if (url.includes('/admin/contests') && options?.method === 'POST') {
      console.log('🚀 INTERCEPTED CONTEST CREATION');
      
      const response = await originalFetch(...args);
      
      if (response.status === 422) {
        const errorData = await response.clone().json();
        console.log('❌ 422 VALIDATION ERRORS:');
        console.log('=========================');
        
        if (errorData.detail && Array.isArray(errorData.detail)) {
          errorData.detail.forEach((error, index) => {
            console.log(`${index + 1}. FIELD: ${error.loc?.join('.')}`);
            console.log(`   ERROR: ${error.msg}`);
            console.log(`   TYPE: ${error.type}`);
            console.log(`   INPUT: ${JSON.stringify(error.input)}`);
            console.log('   ---');
          });
        }
        
        console.log('FULL ERROR RESPONSE:');
        console.log(JSON.stringify(errorData, null, 2));
      }
      
      return response;
    }
    
    return originalFetch(...args);
  };
  
  console.log('✅ Quick debugger auto-installed! Try creating the contest now.');
}
