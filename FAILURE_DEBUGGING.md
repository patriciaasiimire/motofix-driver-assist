# 🔴 Request Submission Failures - Root Cause Analysis

## Why "Failed to Send Requests"?

You've been seeing "Failed to send request" but the requests ARE being sent and processed. The problem is that we don't see **why** they're failing without checking the console logs.

---

## What Actually Happens

### Scenario 1: Backend Returns Error (Status 400)
```
You fill form & click "Send Request"
↓
Frontend sends: POST to backend
↓
Backend says: "400 Bad Request - phone format invalid"
↓
Frontend shows: "Failed to send request" (generic message)
```

**Problem:** Generic error message doesn't tell you what's wrong!

**Solution:** Check console for detailed error
```javascript
// In console you'd see:
❌ Request submission failed: {
  status: 400,
  data: { detail: "Invalid phone format" },  // ← THE REAL ERROR!
  message: "Request failed with status code 400"
}
```

---

## Scenario 2: Backend Service Not Responding (Status 500 or timeout)
```
You fill form & click "Send Request"
↓
Frontend sends: POST to backend
↓
Backend service is cold-starting or crashed
↓
No response after 30 seconds (timeout)
↓
Frontend shows: "Failed to send request"
```

**Real Issue:** Backend server problem, not your data!

---

## Scenario 3: Authentication Token Expired (Status 401)
```
You fill form & click "Send Request"
↓
Frontend includes: JWT token in Authorization header
↓
Backend says: "401 Unauthorized - token expired"
↓
Frontend shows: "Failed to send request"
↓
Axios interceptor: Clears token & redirects to /login
```

**Real Issue:** You need to login again!

---

## How to See the Real Error

### Method 1: Browser Console (Easiest)
```
1. Open DevTools: Press F12
2. Go to: Console tab
3. Try submitting request
4. Look for: "❌ Request submission failed:"
5. Expand the error object to see details
```

### Method 2: Network Tab
```
1. Open DevTools: Press F12
2. Go to: Network tab
3. Try submitting request
4. Find the POST request to: "motofix-service-requests.onrender.com/requests/"
5. Click on it
6. Go to Response tab to see backend's error message
```

### Method 3: Backend Health Check
```
1. Open new browser tab
2. Visit: https://motofix-service-requests.onrender.com/health
3. If it hangs: Service is cold-starting
4. If it shows error: Service has problem
5. If it returns 200: Service is working
```

---

## Real Examples of Failures

### Example 1: Missing Issue Description
```
FORM DATA SENT:
{
  customer_name: "John Doe",
  phone: "+256700123456",
  location: "0.4500, 32.5800",
  description: "",  // ← EMPTY!
  service_type: "Other"
}

BACKEND RESPONSE:
400 Bad Request
{
  "detail": "Description cannot be empty"
}

USER SEES:
"Failed to send request"

USER SHOULD DO:
Write something in "Describe your issue" field
```

### Example 2: Invalid Phone Format
```
FORM DATA SENT:
{
  customer_name: "John Doe",
  phone: "0700123456",  // ← WRONG! Should be +256700123456
  location: "0.4500, 32.5800",
  description: "My tire is flat",
  service_type: "Other"
}

BACKEND RESPONSE:
400 Bad Request
{
  "detail": "Phone must start with +256"
}

USER SEES:
"Failed to send request"

USER SHOULD DO:
Phone is auto-filled, but if you edited it:
- Use format: +256700123456
- Or: 0700123456 (will be converted)
```

### Example 3: Backend Service Cold-Starting
```
FORM DATA SENT:
{
  customer_name: "John Doe",
  phone: "+256700123456",
  location: "0.4500, 32.5800",
  description: "My tire is flat",
  service_type: "Other"
}

BACKEND RESPONSE:
[Waiting... 15 seconds]
[Waiting... 20 seconds]
[Waiting... 30 seconds]
Timeout error

USER SEES:
"Failed to send request"

CONSOLE SHOWS:
{
  message: "timeout of 30000ms exceeded"
}

USER SHOULD DO:
1. Wait 1-2 minutes
2. Try again
3. Next attempt will be fast
```

### Example 4: Token Expired
```
FORM DATA SENT:
(Correct data with expired token)

BACKEND RESPONSE:
401 Unauthorized
{
  "detail": "Token has expired"
}

USER SEES:
"Failed to send request"

AUTOMATICALLY HAPPENS:
- Axios interceptor clears localStorage
- User is redirected to /login
- Existing token is cleared

USER SHOULD DO:
- Logout and login again to get fresh token
- Try submitting request again
```

---

## Your Specific Situation

**You said:** "I have tried to send multiple requests but every one of them says failed"

**Possible Reasons:**

### Possibility A: Validation Error
All requests have something wrong with the data
- Check: Is location showing GPS coordinates?
- Check: Is issue description filled?
- Check: Is phone showing correctly?

**Fix:** Look at console error, fix the field, retry

### Possibility B: Backend Service Down
Backend wasn't responding to any of the requests
- Check: Visit health endpoint (see above)
- Check: Is Render service running?

**Fix:** Wait for service to boot, retry

### Possibility C: Authentication Issue
Your token became invalid after first login
- Check: Console shows "401 Unauthorized"?
- Check: Are you still logged in? (Check Profile page)

**Fix:** Logout and login again, retry

### Possibility D: Network Issues
Your connection dropped during submission
- Check: Is internet working?
- Check: Can you visit other websites?

**Fix:** Check connection, retry

---

## How to Get Exact Error Message

### Copy This Console Code:
```javascript
// Run this in browser console after failing to send
// It will show you the most recent API error
localStorage.getItem('motofix_token')  // Should show token
JSON.parse(localStorage.getItem('motofix_user') || '{}')  // Should show your name
```

### Then Try Sending Request Again
Watch console for:
```
📤 Submitting request: {
  customer_name: "...",
  phone: "...",
  location: "...",
  description: "...",
  service_type: "Other"
}

📤 POST https://motofix-service-requests.onrender.com/requests/

// Then either:
📥 Response from .../requests/: 201 {...}  // SUCCESS!

// OR:
❌ Response error: {
  status: 400,  // <- This number tells you what's wrong
  statusText: "Bad Request",
  data: { detail: "..." },  // <- THIS is the actual error!
  message: "Request failed..."
}
```

---

## Solution: More Helpful Error Messages

I've updated the error handling to show more details. When submission fails, you'll now see:

**Instead of:** "Failed to send request"

**You'll see:**
- "Request timeout - backend service may be starting up. Please try again."
- "Network error - check your connection and backend service status"
- "Backend service temporarily unavailable - please try again in a moment"
- Or the specific backend error message

---

## Testing to Fix

**Do This Now:**

1. **Open DevTools (F12)**
2. **Go to Console tab**
3. **Enter phone and fill issue description**
4. **Click "Send Request"**
5. **Look for error in console**
6. **Take screenshot of the error**
7. **Share the error object** - it will tell us exactly what's wrong

---

## Common Success Indicators

When request is SUCCESSFUL, you should see:

```
✅ Request submitted! A mechanic will respond soon.

Request appears in Home tab with status "pending"

Console shows:
✅ Request submitted successfully: {
  id: "req_abc123",
  status: "pending",
  created_at: "2026-01-27T..."
}
```

If you're NOT seeing this, the submission is failing before reaching backend.

---

## Action Items

1. **Clear your browser cache**
   - DevTools → Application → Clear storage
   - Reload page

2. **Fresh login**
   - Logout from Profile page
   - Login again with your phone number

3. **Try submitting with console open (F12)**
   - Watch for detailed error
   - Screenshot and share if still failing

4. **Check backend is running**
   - Visit: https://motofix-service-requests.onrender.com/health
   - Should show "200 OK"

That's it! Once we see the actual console error, we'll know exactly what to fix.
