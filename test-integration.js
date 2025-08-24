#!/usr/bin/env node

// Quick integration test for backend endpoints
const API_BASE = 'http://localhost:8000';

async function testEndpoint(method, endpoint, data = null, token = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const result = await response.json();
    
    console.log(`✅ ${method} ${endpoint}: ${response.status}`);
    if (response.status >= 400) {
      console.log(`   Error: ${result.detail || result.message || 'Unknown error'}`);
    }
    return { status: response.status, data: result };
  } catch (error) {
    console.log(`❌ ${method} ${endpoint}: ${error.message}`);
    return { status: 0, error: error.message };
  }
}

async function runIntegrationTests() {
  console.log('🚀 Running Backend Integration Tests...\n');
  
  // Test 1: Health Check
  console.log('1. Testing Health Check...');
  await testEndpoint('GET', '/health');
  
  // Test 2: Authentication
  console.log('\n2. Testing Authentication...');
  const authResult = await testEndpoint('POST', '/auth/verify-otp', {
    phone: '+18187958204',
    code: '123456'
  });
  
  if (authResult.data?.access_token) {
    const token = authResult.data.access_token;
    console.log(`   ✅ Got JWT token: ${token.substring(0, 50)}...`);
    
    // Test 3: User Profile
    console.log('\n3. Testing User Endpoints...');
    await testEndpoint('GET', '/user/profile', null, token);
    await testEndpoint('GET', '/user/stats', null, token);
    await testEndpoint('GET', '/user/contests/available', null, token);
    
    // Test 4: Sponsor Endpoints
    console.log('\n4. Testing Sponsor Endpoints...');
    await testEndpoint('GET', '/sponsor/profile', null, token);
    await testEndpoint('GET', '/sponsor/contests', null, token);
    await testEndpoint('GET', '/sponsor/analytics', null, token);
    
    // Test 5: Admin Endpoints
    console.log('\n5. Testing Admin Endpoints...');
    await testEndpoint('GET', '/admin/contests', null, token);
    
    // Test 6: Role Upgrade Request
    console.log('\n6. Testing Role Upgrade...');
    await testEndpoint('POST', '/sponsor/upgrade-request', {
      target_role: 'sponsor',
      company_name: 'Test Company Integration',
      website_url: 'https://test-integration.com',
      industry: 'Technology',
      description: 'Testing the integration'
    }, token);
    
  } else {
    console.log('   ❌ Authentication failed, skipping protected endpoints');
  }
  
  console.log('\n🎯 Integration Test Complete!');
  console.log('\n📋 Next Steps:');
  console.log('1. Frontend should be running on http://localhost:3000');
  console.log('2. Visit /role-tester to test the complete system');
  console.log('3. Test role upgrade at /upgrade-to-sponsor');
  console.log('4. Verify all role-based routes work correctly');
}

// Run the tests
runIntegrationTests().catch(console.error);
