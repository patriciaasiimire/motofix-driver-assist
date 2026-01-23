# 🧪 Persistent Login - Complete Test Cases

**Version:** 1.0.0  
**Date:** January 23, 2026  
**Status:** Ready for Testing

---

## 📋 Pre-Testing Setup

### Prerequisites
- [ ] Backend auth service running (`motofix-auth-service`)
- [ ] `/auth/send-otp`, `/auth/login`, `/auth/me`, `/auth/logout` endpoints working
- [ ] Valid test phone number with OTP capability
- [ ] Browser DevTools open (F12)
- [ ] localStorage visible in DevTools → Application tab

### Test Environment
- **Browser:** Chrome/Firefox/Safari (latest)
- **URL:** http://localhost:5173 or your deployment URL
- **Network:** Good connection (no throttling for initial tests)

---

## 🧪 Test Case 1: Initial Login Flow

**Objective:** Verify user can log in and token is saved to localStorage

### Steps:
1. Open app at http://localhost:5173
2. Should see login form with "Enter Phone Number" step
3. Enter valid test phone (e.g., +256712345678)
4. Click "Send OTP"
5. Should see SMS sent notification
6. Enter OTP received via SMS
7. Click "Login"

### Expected Results:
- ✅ Redirected to `/requests` dashboard
- ✅ Page displays "Service Requests" header
- ✅ Bottom navigation visible (Requests, Create, Profile)
- ✅ **Check DevTools:**
  - localStorage has key `motofix_token` with JWT value
  - localStorage has key `motofix_user` with user object
  - Network tab shows successful `/auth/login` request with 200 status

### Success Criteria:
```javascript
// DevTools Console:
localStorage.getItem('motofix_token')  // Should return JWT string
localStorage.getItem('motofix_user')   // Should return JSON user object
// Example:
{
  "id": "4",
  "phone": "+256712345678",
  "full_name": "John Doe",
  "role": "driver"
}
```

---

## 🧪 Test Case 2: Persistent Login - Page Refresh

**Objective:** Verify user stays logged in after page refresh (F5)

### Prerequisites:
- Must have just completed Test Case 1 (still logged in)

### Steps:
1. You're on `/requests` dashboard (from Test Case 1)
2. Open DevTools → Network tab → Disable cache
3. Press F5 (page refresh)
4. Watch Network tab during load

### Expected Results:
- ✅ Loading spinner appears (1-2 seconds)
- ✅ Dashboard loads automatically (no login form shown)
- ✅ User info displayed correctly
- ✅ **Network tab shows:**
  - `/auth/me` request sent (GET)
  - `/auth/me` returns 200 with user data
  - No `/auth/login` request made
- ✅ **localStorage unchanged:**
  - `motofix_token` still present
  - `motofix_user` still present

### Success Criteria:
```
🎯 User auto-logged in without entering OTP
🎯 No login form shown
🎯 Dashboard loads seamlessly
```

---

## 🧪 Test Case 3: Multi-Tab Consistency

**Objective:** Verify authentication state shared across browser tabs

### Prerequisites:
- Must be logged in from previous test case

### Steps:
1. You have Tab 1: Logged in on `/requests` dashboard
2. Open New Tab 2
3. Type same URL in Tab 2 (http://localhost:5173)
4. Press Enter on Tab 2
5. Observe both tabs

### Expected Results:
- ✅ Tab 2 shows loading spinner briefly
- ✅ Tab 2 auto-loads dashboard (no login form)
- ✅ Both tabs show same user data
- ✅ localStorage is identical across tabs
- ✅ Logout in Tab 1:
  - Tab 1 redirects to login
  - Manually refresh Tab 2
  - Tab 2 also redirects to login (token cleared)

### Success Criteria:
```
🎯 User doesn't need to log in separately per tab
🎯 Authentication state is shared (localStorage)
🎯 Logout affects all tabs
```

---

## 🧪 Test Case 4: Close & Reopen Browser

**Objective:** Verify persistent login survives closing entire browser

### Steps:
1. You're logged in on `/requests` dashboard
2. Close the entire browser (Command+Q on Mac, Alt+F4 on Windows)
3. **Wait 5-10 seconds**
4. Reopen browser
5. Navigate to http://localhost:5173

### Expected Results:
- ✅ Page loads with loading spinner
- ✅ Dashboard automatically displayed
- ✅ User stays logged in (no login form)
- ✅ localStorage still contains token and user

### Success Criteria:
```
🎯 Session persists across complete browser shutdown
🎯 Token still valid after hours/days
🎯 No manual login required
```

---

## 🧪 Test Case 5: Direct Navigation to Protected Routes

**Objective:** Verify protected routes redirect unauthenticated users

### Steps:
1. **Clear localStorage first:**
   - DevTools → Application → localStorage → Delete `motofix_token` and `motofix_user`
2. Type URL: `http://localhost:5173/requests` (protected route)
3. Press Enter

### Expected Results:
- ✅ Redirects automatically to `/login`
- ✅ Login form displayed
- ✅ No errors in console

### Repeat for Other Protected Routes:
- [ ] `/create-request` → redirects to login
- [ ] `/profile` → redirects to login
- [ ] `/requests` → redirects to login

### Success Criteria:
```
🎯 Protected routes cannot be accessed without token
🎯 Automatic redirect to login works
🎯 No console errors
```

---

## 🧪 Test Case 6: Token Expiration Simulation

**Objective:** Verify app handles expired/invalid tokens correctly

### Prerequisites:
- Must be logged in

### Steps:
1. DevTools → Application → localStorage
2. Find `motofix_token` key
3. Manually modify the token value:
   - Change last 10 characters to random text
   - Example: `eyJhbGc...OLD` → `eyJhbGc...CORRUPTED123`
4. Refresh page (F5)

### Expected Results:
- ✅ Loading spinner appears
- ✅ Backend returns 401 Unauthorized
- ✅ Toast message: "Session expired – please login again"
- ✅ Redirected to `/login`
- ✅ **DevTools localStorage shows:**
  - `motofix_token` is REMOVED
  - `motofix_user` is REMOVED

### Success Criteria:
```
🎯 Invalid token handled gracefully
🎯 User-friendly error message shown
🎯 Auto-cleanup of corrupted data
🎯 Redirect to login
```

---

## 🧪 Test Case 7: Logout Functionality

**Objective:** Verify logout clears token and logs user out

### Prerequisites:
- Must be logged in

### Steps:
1. Navigate to `/profile` page
2. Scroll down to bottom
3. Click red "Logout" button
4. Observe redirect and localStorage

### Expected Results:
- ✅ Toast message: "Logged out successfully"
- ✅ Redirected to `/login`
- ✅ Login form displayed
- ✅ **DevTools localStorage shows:**
  - `motofix_token` REMOVED
  - `motofix_user` REMOVED
- ✅ Network tab shows `/auth/logout` POST request

### Success Criteria:
```
🎯 Logout button works
🎯 User redirected to login
🎯 All tokens cleared
🎯 Cannot access protected routes
```

---

## 🧪 Test Case 8: Logout & Cannot Reaccess Without Login

**Objective:** Verify logged-out user cannot access dashboard

### Prerequisites:
- Just completed Test Case 7 (logged out)

### Steps:
1. You're on `/login` page (from previous logout)
2. Try to access `/requests` directly by typing in address bar
3. Press Enter

### Expected Results:
- ✅ Redirects back to `/login`
- ✅ Login form displayed
- ✅ Cannot access dashboard without entering credentials

### Success Criteria:
```
🎯 Cannot bypass login via direct URL
🎯 Protected routes enforced
🎯 Complete logout works
```

---

## 🧪 Test Case 9: API Requests Include Token

**Objective:** Verify every API request includes Authorization header

### Prerequisites:
- Must be logged in

### Steps:
1. DevTools → Network tab
2. Navigate to `/requests` (or `/create-request`)
3. Look for any API request (GET, POST, etc.)
4. Click on request → Headers tab

### Expected Results:
- ✅ **In "Request Headers" section, see:**
  ```
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```
- ✅ Every request to backend includes this header
- ✅ Token matches `localStorage.getItem('motofix_token')`

### Success Criteria:
```
🎯 Authorization header present on all requests
🎯 Token format is correct (Bearer + JWT)
🎯 Token matches localStorage value
```

---

## 🧪 Test Case 10: Responsive Design - Mobile

**Objective:** Verify persistent login works on mobile screens

### Steps:
1. DevTools → Toggle Device Toolbar (Ctrl+Shift+M)
2. Select iPhone 12 or similar mobile device
3. Go through Test Case 1 (login)
4. Verify Test Case 2 (refresh works)

### Expected Results:
- ✅ Login form fits mobile screen
- ✅ Button clicks work on touch
- ✅ Token saved correctly
- ✅ Auto-login works on refresh
- ✅ Bottom navigation visible and clickable
- ✅ No layout issues

### Success Criteria:
```
🎯 Mobile-friendly login
🎯 Responsive design works
🎯All features functional on mobile
```

---

## 🧪 Test Case 11: Concurrent API Requests

**Objective:** Verify token is included in all simultaneous requests

### Prerequisites:
- Must be logged in

### Steps:
1. DevTools → Network tab
2. Navigate to a page that makes multiple API calls (e.g., `/create-request`)
3. Look at all requests being made simultaneously

### Expected Results:
- ✅ All requests have `Authorization` header
- ✅ No requests fail with 401
- ✅ All requests complete successfully

### Success Criteria:
```
🎯 Multiple concurrent requests all authenticated
🎯 No 401 errors
🎯 Token injection works for all requests
```

---

## 🧪 Test Case 12: Error Scenario - Network Down

**Objective:** Verify app handles network failures gracefully

### Steps:
1. DevTools → Network tab
2. While logged in, click "Offline" mode
3. Try to make an API request (navigate page, click button)
4. Observe error handling

### Expected Results:
- ✅ Request fails with network error (not 401)
- ✅ User sees error toast or message
- ✅ Not redirected to login (network error ≠ auth error)
- ✅ App remains in current state

### Success Criteria:
```
🎯 Network errors handled separately from auth errors
🎯 User not logged out due to network issue
🎯 Clear error messaging
```

---

## 📊 Test Summary Sheet

| Test Case | Description | Status | Notes |
|-----------|-------------|--------|-------|
| 1 | Initial Login | [ ] | OTP received, token saved |
| 2 | Page Refresh | [ ] | Auto-login after refresh |
| 3 | Multi-Tab | [ ] | Shared auth across tabs |
| 4 | Browser Close | [ ] | Survives shutdown |
| 5 | Protected Routes | [ ] | Redirect without token |
| 6 | Token Expiration | [ ] | Handle invalid token |
| 7 | Logout | [ ] | Clear token & redirect |
| 8 | Post-Logout | [ ] | Cannot access without login |
| 9 | Token Injection | [ ] | Authorization header present |
| 10 | Mobile | [ ] | Works on mobile screens |
| 11 | Concurrent Requests | [ ] | All requests authenticated |
| 12 | Network Down | [ ] | Handles gracefully |

---

## ✅ Final Verification Checklist

- [ ] All 12 test cases passed
- [ ] No console errors (F12)
- [ ] No network 401 errors
- [ ] localStorage structure correct
- [ ] Token format is JWT (starts with `eyJ`)
- [ ] Logout completely clears tokens
- [ ] Mobile responsive
- [ ] User experience smooth (no unnecessary redirects)
- [ ] Error messages user-friendly
- [ ] Ready for production deployment

---

## 🚀 When All Tests Pass

Once all test cases pass:

1. **Code Ready:** Persistent login fully implemented
2. **Documented:** All features documented
3. **Tested:** Complete test coverage
4. **Deploy:** Ready for production
5. **Monitor:** Set up error tracking (Sentry, etc.)

---

## 🆘 Troubleshooting

### Issue: Token not saving to localStorage
**Check:**
- Is localStorage enabled in browser?
- Are you in private/incognito mode? (disables localStorage)
- Check console for JavaScript errors

### Issue: Auto-login not working
**Check:**
- DevTools → Network → Is `/auth/me` request being made?
- Is backend returning 200 + user data?
- Is token format correct (starts with `eyJ`)?

### Issue: Getting 401 on every request
**Check:**
- Is `Authorization: Bearer` header present?
- Is token valid (not corrupted)?
- Does backend recognize this token format?

### Issue: Logout button not working
**Check:**
- Click Logout → Is `logout()` function called?
- Check console for JavaScript errors
- Is `/auth/logout` API request being made?

---

## 📞 Support

If issues arise:
1. Check browser console (F12) for errors
2. Check Network tab for API response codes
3. Verify localStorage contents
4. Check backend logs for auth errors
5. Review implementation files for logic errors

---

**Testing Date:** _____________  
**Tester Name:** _____________  
**Result:** ☐ All Passed | ☐ Issues Found  

**Issues Found (if any):**
```
1. _________________________________________
2. _________________________________________
3. _________________________________________
```

---

**Status:** ✅ Ready for Production Testing
