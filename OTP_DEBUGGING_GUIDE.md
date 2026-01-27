# 🔧 OTP Send Debugging Guide

## What I've Fixed

I've enhanced the error reporting and debugging capabilities:

### 1. **Better Error Messages**
- Network timeouts now show: "Backend service may be starting up"
- Service unavailable (503) shows: "Backend service temporarily unavailable"
- Other errors show the specific error message

### 2. **Enhanced Logging**
All network requests now log:
- Request method and URL
- Whether authentication token is attached
- Response status and data
- Full error details including status codes

### 3. **Health Check System**
- `checkServiceHealth()` - Tests both Auth and Requests services
- `testAuthEndpoint()` - Tests the OTP endpoint specifically
- Automatically runs on Login page load

### 4. **Console Debugging Steps**

To debug the OTP send issue:

**Step 1: Open Browser DevTools**
- Press `F12` or right-click → Inspect → Console tab
- You should see logs starting with emojis (🚀, 🔍, 📞, etc.)

**Step 2: Check Initial Logs**
Look for:
```
🚀 Initializing Motofix API: {...}
🏥 Checking Motofix services health...
🔍 Checking Auth Service: https://motofix-auth-service.onrender.com
```

**Step 3: Try Sending OTP**
1. Enter a valid phone number (e.g., +256700123456 or 0700123456)
2. Click "Send Code"
3. Check console for detailed error:
```
📞 Sending OTP to: +256...
📤 POST https://motofix-auth-service.onrender.com/auth/send-otp
📥 Response: [status code] [response data]
// OR
❌ OTP send failed: { status: X, data: {...}, message: "..." }
```

## Common Issues & Solutions

### Issue: "Request timeout - backend service may be starting up"
**Cause:** Render.com free tier services cold-start (sleep when not used)
**Solution:** Wait 1-2 minutes and try again. Services take time to boot up.

### Issue: "Network error - check your connection and backend service status"
**Cause:** CORS issue or backend not responding
**Check:**
1. Backend URLs in `src/config/api.ts`:
   - AUTH_BASE_URL: `https://motofix-auth-service.onrender.com`
   - REQUESTS_BASE_URL: `https://motofix-service-requests.onrender.com`
2. Backend must have CORS enabled for this frontend URL
3. Backend services must be deployed and running on Render.com

### Issue: "Response status 401 or 403"
**Cause:** Backend authentication issue
**Check:** API endpoint configuration and backend implementation

### Issue: "Response status 500"
**Cause:** Backend server error
**Check:** Backend logs on Render.com dashboard

## How to Get More Info

Run these in browser console:

```javascript
// Test Auth Service
import { testAuthEndpoint } from '/src/config/health.ts'
await testAuthEndpoint('+256700123456')

// Check Service Health
import { checkServiceHealth } from '/src/config/health.ts'
await checkServiceHealth()

// Check localStorage
localStorage.getItem('motofix_token')
localStorage.getItem('motofix_user')
```

## What to Look For in Logs

**✅ Successful OTP Send:**
```
📞 Sending OTP to: +256...
📤 POST .../auth/send-otp
📥 Response from .../auth/send-otp: 200 {success: true, ...}
✅ Success toast shown
```

**❌ Failed OTP Send:**
```
📞 Sending OTP to: +256...
📤 POST .../auth/send-otp
❌ Response error: {
  status: [code],
  statusText: "...",
  data: {...},
  message: "..."
}
```

## Quick Fixes to Try

1. **Clear Cache:**
   - DevTools → Application → Clear storage
   - Reload page

2. **Check Backend Status:**
   - Visit: https://motofix-auth-service.onrender.com/health
   - Should return 200 OK

3. **Verify Phone Format:**
   - Supported: +256700123456, 0700123456
   - Must be 10 digits after country code
