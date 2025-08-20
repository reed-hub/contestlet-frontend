# 📱 Twilio Integration Setup Guide

This guide explains how to properly configure Twilio Verify API integration for SMS-based authentication in the Contestlet application.

## 🔧 Current Integration Status

✅ **Frontend**: Fully integrated with Twilio Verify API endpoints
✅ **Backend**: Ready for Twilio configuration
✅ **Development Mode**: Mock SMS with code `123456`
⚙️ **Production**: Requires Twilio account setup

## 🔐 Twilio Verify API Configuration

### Backend Environment Variables

Add these to your backend `.env` file:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=AC829dbe9395c71407a7f60887cb816a3a
TWILIO_AUTH_TOKEN=3f376878eacd0d7e81e090c1aeae5368
TWILIO_VERIFY_SERVICE_SID=VA89f2b01132c234a3fd2f3981f81bb773

# SMS Mode
USE_MOCK_SMS=true   # Development: false for production
```

### Frontend Environment Variables

Add these to your frontend `.env` file:

```env
# API Configuration
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development
```

## 🎯 Development vs Production

### Development Mode (`USE_MOCK_SMS=true`)

**Features:**
- ✅ No real SMS sent
- ✅ Always accept OTP code: `123456`
- ✅ OTP codes logged to server console
- ✅ No Twilio charges
- ✅ Instant verification for testing

**Frontend shows:**
- "Development: use 123456" hints
- Twilio branding in messages
- Development mode indicators

### Production Mode (`USE_MOCK_SMS=false`)

**Features:**
- 📱 Real SMS sent via Twilio Verify API
- 🔐 Random 6-digit verification codes
- ⏱️ Rate limiting enforced by Twilio
- 💰 Twilio charges apply
- 🌍 International phone number support

## 📋 API Endpoints Used

### Request OTP (User & Admin)
```http
POST /auth/request-otp
Content-Type: application/json

{
  "phone": "5551234567"
}
```

**Response:**
```json
{
  "message": "OTP sent successfully",
  "retry_after": null
}
```

### Verify OTP (User & Admin)
```http
POST /auth/verify-otp
Content-Type: application/json

{
  "phone": "5551234567",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user_id": 123
}
```

### Check User Role (Admin Authentication)
```http
GET /auth/me
Authorization: Bearer <access_token>
```

**Response (Admin User):**
```json
{
  "id": 1,
  "phone": "+18187958204",
  "role": "admin",
  "authenticated": true
}
```

**Response (Regular User):**
```json
{
  "id": 2,
  "phone": "+15551234567",
  "role": "user",
  "authenticated": true
}
```

## 🔑 Twilio Account Setup

### 1. Create Twilio Account
1. Visit [twilio.com](https://www.twilio.com/verify)
2. Sign up for a free account
3. Navigate to Verify Services

### 2. Create Verify Service
1. Go to **Verify** → **Services**
2. Click **Create new Service**
3. Name: "Contestlet Verification"
4. Copy the **Service SID** (starts with `VA`)

### 3. Get Account Credentials
1. Go to **Console** → **Account Info**
2. Copy **Account SID** (starts with `AC`)
3. Copy **Auth Token** (click to reveal)

### 4. Update Environment Variables
```env
TWILIO_ACCOUNT_SID=AC_your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_VERIFY_SERVICE_SID=VA_your_service_sid
USE_MOCK_SMS=false  # Enable real SMS

# Admin Configuration
ADMIN_PHONES=+18187958204,+15551234567  # Comma-separated admin phone numbers
```

## 📱 Supported Phone Formats

The system accepts multiple US phone number formats:

```javascript
// All these formats work:
"5551234567"          // 10 digits
"15551234567"         // 11 digits with country code
"+15551234567"        // International format
"(555) 123-4567"      // Formatted
"555-123-4567"        // Dashed
"555.123.4567"        // Dotted
```

## 🛡️ Admin Authentication

### Admin OTP Flow
1. **Admin Phone**: Must be listed in `ADMIN_PHONES` environment variable
2. **OTP Request**: Same `POST /auth/request-otp` endpoint
3. **OTP Verify**: Same `POST /auth/verify-otp` endpoint  
4. **Role Check**: `GET /auth/me` verifies `role === "admin"`
5. **Admin Access**: JWT token grants admin privileges

### Admin Setup Steps
```bash
# 1. Add admin phone to backend .env
ADMIN_PHONES=+18187958204,+15551234567

# 2. Restart backend server
# 3. Navigate to /admin 
# 4. Enter admin phone number
# 5. Use OTP code (123456 in development)
# 6. System verifies admin role automatically
```

### Admin vs User Authentication
| Feature | User Auth | Admin Auth |
|---------|-----------|------------|
| **Endpoint** | Same OTP endpoints | Same OTP endpoints |
| **Role Check** | Not required | `GET /auth/me` required |
| **Phone Restriction** | Any valid phone | Must be in `ADMIN_PHONES` |
| **Token Use** | Contest entry | Admin panel access |
| **Redirect** | Contest success | `/admin/contests` |

## 🧪 Testing

### Development Testing
```javascript
// User authentication:
phone: "5551234567"      // Any phone
code: "123456"           // Always works in mock mode

// Admin authentication:
phone: "18187958204"     // Must be admin phone
code: "123456"           // Always works in mock mode
```

### Production Testing
```javascript
// User authentication:
phone: "your_real_phone"
code: "actual_sms_code"  // From real SMS

// Admin authentication:
phone: "admin_real_phone"  // From ADMIN_PHONES list
code: "actual_sms_code"    // From real SMS
```

## ⚠️ Rate Limiting

Twilio Verify API enforces rate limits:

- **5 OTP requests** per 5-minute window per phone number
- **Frontend handles**: 429 responses with retry_after
- **User sees**: "Twilio rate limit exceeded. Try again in X seconds."

## 🔍 Debugging

### Check Server Logs
```bash
# Backend console shows:
[INFO] OTP sent via Twilio to +15551234567
[INFO] OTP verification attempt for +15551234567
[INFO] User authenticated via Twilio Verify
```

### Browser Console
```javascript
// Frontend shows:
console.log('SMS sent via Twilio! (Development: use 123456)');
console.log('Phone verified via Twilio!');
```

### Common Issues

**Issue: 403 Forbidden**
- Check Twilio credentials in backend `.env`
- Verify Twilio account is active

**Issue: Invalid phone number**
- Must be valid US phone number
- Check phone number formatting

**Issue: OTP expired**
- Codes expire after 10 minutes
- Request new OTP if expired

## 💰 Twilio Pricing

**Verify API Pricing:**
- **SMS Verification**: ~$0.05 per attempt
- **Voice Verification**: ~$0.13 per attempt
- **Free Trial**: $15 credit for testing

**Production Estimates:**
- 1000 users/month: ~$50/month
- 10000 users/month: ~$500/month

## 🚀 Production Checklist

- [ ] Twilio account created and verified
- [ ] Verify Service configured
- [ ] Production credentials in backend `.env`
- [ ] `USE_MOCK_SMS=false` set
- [ ] Phone number validation working
- [ ] Rate limiting tested
- [ ] Error handling verified
- [ ] SMS delivery tested with real phones

## 📞 Support

**Twilio Support:**
- [Twilio Console](https://console.twilio.com/)
- [Verify API Docs](https://www.twilio.com/docs/verify/api)
- [Twilio Support](https://support.twilio.com/)

**Contestlet Support:**
- Check backend logs
- Review API documentation
- Test with development mode first
