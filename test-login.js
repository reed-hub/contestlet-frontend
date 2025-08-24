// Test script for login functionality
const API_BASE_URL = 'http://localhost:8000';

// Test phone numbers from backend documentation
const testNumbers = [
  '+18187958204', // Admin user
  '+15551234567', // Regular user  
  '+15559876543'  // Sponsor user
];

async function testLoginFlow(phoneNumber) {
  console.log(`\n🧪 Testing login flow for: ${phoneNumber}`);
  
  try {
    // Step 1: Request OTP
    console.log('📱 Requesting OTP...');
    const otpResponse = await fetch(`${API_BASE_URL}/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneNumber })
    });
    
    if (!otpResponse.ok) {
      const error = await otpResponse.json();
      console.log(`❌ OTP request failed: ${otpResponse.status} - ${error.detail || 'Unknown error'}`);
      return false;
    }
    
    console.log('✅ OTP request successful');
    
    // Step 2: Verify OTP (using test code 123456)
    console.log('🔐 Verifying OTP with code: 123456');
    const verifyResponse = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneNumber, code: '123456' })
    });
    
    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      console.log(`❌ OTP verification failed: ${verifyResponse.status} - ${error.detail || 'Unknown error'}`);
      return false;
    }
    
    const data = await verifyResponse.json();
    console.log(`✅ Login successful! Role: ${data.role}, Token: ${data.access_token ? 'Received' : 'Missing'}`);
    
    return true;
    
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting login flow tests...\n');
  
  let successCount = 0;
  let totalCount = testNumbers.length;
  
  for (const phoneNumber of testNumbers) {
    const success = await testLoginFlow(phoneNumber);
    if (success) successCount++;
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n📊 Test Results: ${successCount}/${totalCount} successful`);
  
  if (successCount === totalCount) {
    console.log('🎉 All tests passed! Login system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the backend logs for details.');
  }
}

// Check if backend is running
async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (response.ok) {
      console.log('✅ Backend is running and healthy');
      return true;
    } else {
      console.log('❌ Backend is running but unhealthy');
      return false;
    }
  } catch (error) {
    console.log('❌ Backend is not running or not accessible');
    console.log(`   Make sure the backend is running on ${API_BASE_URL}`);
    return false;
  }
}

// Main execution
async function main() {
  const backendHealthy = await checkBackendHealth();
  if (backendHealthy) {
    await runTests();
  } else {
    console.log('\n💡 To run these tests:');
    console.log('   1. Start your backend server');
    console.log('   2. Make sure it\'s running on http://localhost:8000');
    console.log('   3. Run this script again');
  }
}

main().catch(console.error);
