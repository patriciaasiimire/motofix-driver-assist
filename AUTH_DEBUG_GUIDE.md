# Persistent Login Debugging Guide

## Problem Statement

Users are being redirected to login page on page reload/close, even though persistent login code is implemented.

**Expected behavior:** After login, users stay logged in across page reloads and tab closes.
**Actual behavior:** Users are sent back to login page on reload.

---

## Root Cause Investigation

The persistent login flow requires these components to work:

```
1. [Frontend] Save token to localStorage
   ↓
2. [Frontend] On mount, check localStorage for token
   ↓
3. [Frontend] Call GET /auth/me with token in Authorization header
   ↓
4. [Backend] Verify token, return user data
   ↓
5. [Frontend] User authenticated, stay on current page
   ✓ If step 4 fails → clear localStorage, redirect to login
```

---

## What We've Implemented

### Frontend (React/Vite)

**File:** `src/hooks/useAuth.ts`
- ✅ Saves token to `localStorage.motofix_token` on login
- ✅ Saves user to `localStorage.motofix_user` on login  
- ✅ On app mount, checks localStorage for existing token
- ✅ Loads cached user instantly for zero flicker
- ✅ Calls `/auth/me` to verify token is still valid
- ✅ Detailed console logging with emojis (🔍 🔐 ✅ ❌ ⚠️)

**File:** `src/config/api.ts`
- ✅ Axios interceptor adds `Authorization: Bearer TOKEN` header to all requests
- ✅ If server returns 401, clears localStorage and redirects to `/login`
- ✅ `withCredentials: true` for httpOnly cookies

**File:** `src/components/PrivateRoute.tsx`
- ✅ Checks if user is authenticated
- ✅ Shows loading spinner while auth is being verified
- ✅ Redirects to login if not authenticated

### Backend (FastAPI)

**File:** `app/routers/auth.py`
- ✅ `POST /auth/login` - Creates JWT token and returns it
- ✅ `GET /auth/me` - Verifies token and returns user data
- ✅ Token verification checks Bearer token in Authorization header
- ✅ Falls back to httpOnly cookie if no Authorization header
- ✅ Detailed logging of all auth attempts

**File:** `app/main.py`
- ✅ CORS configured for driver app origin
- ✅ `allow_credentials=True` enables cookies and auth headers
- ✅ Startup logging shows CORS is enabled
- ✅ Global exception handler catches and logs all errors

---

## Debugging Steps

### Step 1: Check Browser Console

1. Open driver app: https://motofix-driver-assist.onrender.com
2. Open **DevTools** → **Console** tab
3. Look for console logs from `useAuth.ts`

**You should see:**
```
📱 useAuth mounted - checking for existing session...
🔍 localStorage check: token? true user? true
✅ Loaded cached user: {id: "123", phone: "+256..."}
🔄 Starting server verification...
✅ checkAuth: token exists? true
✅ Token found, verifying with /auth/me...
✅ Auth verification succeeded: {id: "123", phone: "+256..."}
```

**If you see instead:**
```
❌ Auth check failed: 401 Unauthorized
```
→ Token is being sent but server rejected it

**If you see:**
```
ℹ️ No cached user found
```
→ Token was never saved to localStorage during login

---

### Step 2: Check Network Tab

1. Open **DevTools** → **Network** tab
2. Go to login page
3. Enter phone and OTP to login
4. Watch the requests

**Look for:**
- ✅ `POST /auth/send-otp` (200 OK)
- ✅ `POST /auth/login` (200 OK with `access_token` in response)
- Response should contain:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 123,
      "phone": "+256701234567",
      "full_name": "John",
      "role": "driver"
    }
  }
  ```

5. After successful login, **reload the page**
6. Watch for `GET /auth/me` request
   - ✅ Should have `Authorization: Bearer <token>` header
   - ✅ Should return 200 OK with user data
   - ❌ If 401: token is invalid or SECRET_KEY changed on server
   - ❌ If 0 (blocked): CORS error preventing request

---

### Step 3: Check localStorage

In browser console, run:
```javascript
// Check if token exists
console.log(localStorage.getItem('motofix_token'));

// Check if user exists
console.log(JSON.parse(localStorage.getItem('motofix_user')));

// Check all localStorage
console.log(localStorage);
```

**Expected output after login:**
```javascript
{
  motofix_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  motofix_user: '{"id":123,"phone":"+256701234567","full_name":"John","role":"driver"}'
}
```

---

### Step 4: Test /auth/me Endpoint Directly

In browser console:
```javascript
// Get token from localStorage
const token = localStorage.getItem('motofix_token');

// Call /auth/me directly with curl (from terminal)
// Or use Postman / VS Code REST Client
```

**Using curl (from Windows PowerShell):**
```powershell
$token = "YOUR_TOKEN_HERE"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$response = Invoke-WebRequest `
    -Uri "https://motofix-auth-service.onrender.com/auth/me" `
    -Headers $headers `
    -Method GET
Write-Host $response.Content
```

**Expected response (200 OK):**
```json
{
  "id": 123,
  "phone": "+256701234567",
  "full_name": "John",
  "role": "driver"
}
```

**If 401 Unauthorized:**
- Token is invalid or expired
- Check SECRET_KEY on server hasn't changed
- Check JWT expiry hasn't passed

**If 0 (no response):**
- CORS error
- Origin not allowed
- Check server CORS config

---

### Step 5: Check Backend Logs

Deploy the changes and check Render logs:

**Expected on startup:**
```
============================================================
🚀 MOTOFIX Auth Service Starting
============================================================
✅ CORS Enabled for:
   • https://motofix-driver-assist.onrender.com
   • https://motofixug.onrender.com
   • localhost:3000, 8080, 5173 (dev)
✅ Credentials allowed: Yes (httpOnly cookies + Bearer tokens)
============================================================
```

**Expected on login:**
```
🔐 [POST /auth/login] Login attempt for phone: +256701234567
✅ [POST /auth/login] Existing user found: +256701234567
✅ [POST /auth/login] JWT created for user_id: 123
✅ [POST /auth/login] Login successful for phone: +256701234567, token issued
```

**Expected on /auth/me call:**
```
🔍 [get_current_user] Origin: https://motofix-driver-assist.onrender.com
📋 [get_current_user] Headers: Authorization=True
✅ [get_current_user] Bearer token found in Authorization header (length=200)
🔐 [get_current_user] Verifying token...
✅ [Token Decode] Successfully decoded token for user_id: 123
✅ [Auth] User verified successfully: +256701234567
✅ [GET /auth/me] Successfully verified user: +256701234567
```

---

## Common Issues & Fixes

### Issue 1: Token Not Saving to localStorage

**Symptom:** No token in localStorage after login
**Check:**
1. Does login response contain `access_token`?
2. Is there an error in the `login()` function?
3. Check browser console for errors

**Fix:**
```typescript
// In Login.tsx, add error logging
const handleOtpSubmit = async () => {
  try {
    const userData = await login(phone, otp);
    console.log("✅ Login successful:", userData);
  } catch (error) {
    console.error("❌ Login error:", error);
  }
};
```

---

### Issue 2: /auth/me Returns 401

**Symptom:** Token in localStorage but /auth/me returns 401
**Causes:**
1. ❌ SECRET_KEY changed on server
2. ❌ JWT expiry too short (default 30 days)
3. ❌ Token format wrong

**Fix:**
1. Check SECRET_KEY environment variable on Render
2. Check JWT creation in `utils.py`
3. Verify token is being sent with `Bearer ` prefix

---

### Issue 3: CORS Error (Network Error 0)

**Symptom:** No /auth/me request in Network tab, or status 0
**Causes:**
1. ❌ Driver app origin not in allow_origins
2. ❌ CORS headers not being sent
3. ❌ Browser security policy blocking

**Fix:**
1. Verify driver app URL in CORS config:
   ```python
   allow_origins=[
       "https://motofix-driver-assist.onrender.com",  # ← Exact match required
   ]
   ```
2. Check Render logs for CORS startup message
3. Try from localhost:3000 to isolate issue

---

### Issue 4: /auth/me Request Not Being Made

**Symptom:** No /auth/me in Network tab after reload
**Causes:**
1. ❌ PrivateRoute redirecting before /auth/me can complete
2. ❌ useAuth.ts loading state stays true forever
3. ❌ checkAuth() not being called on mount

**Fix:**
Check `useAuth.ts` console logs:
- 🔄 "Starting server verification..." should appear
- If not, useEffect didn't run

---

## Testing Checklist

- [ ] User can login with phone + OTP
- [ ] Token appears in localStorage after login
- [ ] User data appears in localStorage after login
- [ ] Page reload doesn't show login page (token being verified)
- [ ] Network tab shows GET /auth/me with Authorization header
- [ ] /auth/me returns 200 OK with user data
- [ ] User sees their profile/dashboard after reload
- [ ] Logout clears localStorage
- [ ] After logout, reload shows login page
- [ ] Can login again after logout
- [ ] Opening new tab shows user as logged in
- [ ] Closing and reopening tab shows user as logged in
- [ ] Invalid token shows "Session expired" toast

---

## What the Logging Tells You

| Log | Meaning |
|-----|---------|
| 📱 useAuth mounted | Component initialized, checking session |
| 🔍 localStorage check: token? true | Token found in storage |
| ✅ Loaded cached user | Using cached user for instant UI |
| 🔄 Starting server verification | Calling /auth/me to verify |
| ✅ Token found, verifying | Authorization header being sent |
| ✅ Auth verification succeeded | Server confirmed token is valid |
| ❌ Auth check failed: 401 | Server rejected token |
| ❌ No token found | localStorage is empty |
| ℹ️ No cached user found | First login or localStorage cleared |
| 🚪 Logout initiated | User clicked logout |
| ✅ localStorage cleared | Token and user data removed |

---

## Quick Test Script

Save as `test-auth.js` in browser console:

```javascript
async function testAuth() {
  console.log("=== TESTING PERSISTENT LOGIN ===\n");

  // 1. Check localStorage
  console.log("1️⃣ Checking localStorage...");
  const token = localStorage.getItem('motofix_token');
  const user = localStorage.getItem('motofix_user');
  console.log("   Token exists?", !!token);
  console.log("   User exists?", !!user);

  if (!token) {
    console.log("❌ No token found. Please login first.\n");
    return;
  }

  // 2. Test /auth/me
  console.log("\n2️⃣ Testing GET /auth/me...");
  try {
    const response = await fetch('https://motofix-auth-service.onrender.com/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include'
    });
    console.log("   Status:", response.status);
    const data = await response.json();
    console.log("   Response:", data);
    
    if (response.status === 200) {
      console.log("\n✅ PERSISTENT LOGIN WORKING!");
    } else {
      console.log("\n❌ Token rejected by server");
    }
  } catch (error) {
    console.error("❌ Network error:", error.message);
  }
}

testAuth();
```

---

## Next Steps

1. **Deploy changes to Render**
   - Check that backend has new logging
   - Check startup logs appear

2. **Test login flow**
   - Login with phone + OTP
   - Check token in localStorage
   - Check Network tab for /auth/me

3. **Check logs**
   - Render logs show no errors
   - /auth/me succeeds with 200 OK

4. **Verify persistence**
   - Reload page → should stay logged in
   - Close tab → reopen → should stay logged in
   - Inspect Network tab to confirm /auth/me called

5. **If still broken**
   - Share browser console logs (with emojis)
   - Share Network tab screenshot (headers + response)
   - Share Render backend logs
   - Check if SECRET_KEY environment variable is set correctly

---

## Key Files

- **Frontend:** `src/hooks/useAuth.ts` (auth state + persistent login logic)
- **Frontend:** `src/config/api.ts` (axios interceptor + token injection)
- **Backend:** `app/routers/auth.py` (token verification)
- **Backend:** `app/main.py` (CORS + logging)

All files include detailed console/server logs to help debug issues.
