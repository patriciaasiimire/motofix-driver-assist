# 📋 Request Processing Flow & Troubleshooting

## Why OTP Came on Second Trial

**Render.com Cold Start Issue:**
- First request: Services were sleeping (free tier) → timeout after 30s
- Second request: Services had woken up → request succeeded
- **Solution:** Services now stay warm for ~15 minutes of inactivity. Subsequent requests are fast.

---

## Request Processing Flow

### How Your App Works:

```
1. DRIVER SUBMITS REQUEST
   ├─ Location: GPS auto-detected (or manually entered)
   ├─ Issue: Text description (what's wrong)
   ├─ Media: Optional (voice notes, photos, files)
   └─ Contact: Driver's phone auto-filled

2. FRONTEND VALIDATION
   ├─ Issue description required ✓
   ├─ Location required ✓
   └─ Phone auto-populated ✓

3. API SUBMISSION
   ├─ POST to: https://motofix-service-requests.onrender.com/requests/
   ├─ Includes: customer_name, service_type, location, description, phone
   └─ JWT Token: Automatically attached in Authorization header

4. BACKEND PROCESSING (Auth Service + Requests Service)
   ├─ Auth Service: Validates JWT token
   ├─ Requests Service: Creates request record in database
   └─ Status: Set to "pending" initially

5. MECHANIC NOTIFICATION
   ├─ Backend should trigger: SMS/push notification to available mechanics
   ├─ Status updates: pending → accepted → in_progress → completed
   └─ Driver sees: Real-time status updates

6. COMPLETION
   ├─ Request appears in: Active Requests (Home tab)
   └─ After done: Moves to History tab (completed/cancelled)
```

---

## Why Your Requests Say "Failed"

### Common Causes:

#### **1. Backend Service Not Running**
- Check: https://motofix-service-requests.onrender.com/health
- If it returns 200: Service is running
- If it times out: Service is cold-starting or down

#### **2. Validation Error**
Look for these in console logs:
```
❌ Request submission failed: {
  status: 400,
  data: { detail: "validation error message" }
}
```

Common validation issues:
- `customer_name` missing or empty
- `phone` invalid format (must be +256XXXXXXXXX)
- `location` empty
- `description` too short/empty
- `service_type` invalid value

#### **3. Authentication Error (401)**
```
❌ Request submission failed: {
  status: 401,
  data: { detail: "Unauthorized" }
}
```
**Fix:** Try logging out and back in:
- Open DevTools → Application → Storage
- Clear localStorage
- Log in again to get fresh token

#### **4. Server Error (500)**
```
❌ Request submission failed: {
  status: 500,
  data: { detail: "Internal server error" }
}
```
**Cause:** Bug in backend code
**Fix:** Backend developer needs to check server logs

#### **5. Network Timeout**
```
❌ Request submission failed: {
  message: "timeout of 30000ms exceeded"
}
```
**Cause:** Backend service too slow or not responding
**Fix:** Wait for Render service to boot, then retry

---

## How to Debug Failed Requests

### Step 1: Open Browser DevTools (F12)
Go to **Console** tab

### Step 2: Try to Submit a Request
Fill in form and click "Send Request"

### Step 3: Look for Detailed Error
You should see logs like:
```
📤 Submitting request: {
  customer_name: "John Doe",
  issue: "Tire is flat",
  location: "0.4500, 32.5800",
  phone: "+256700123456",
  media_files: 0
}

📤 POST https://motofix-service-requests.onrender.com/requests/

// If successful:
📥 Response from .../requests/: 201 {id: "req_xyz", status: "pending"}
✅ Success toast shown

// If failed:
❌ Response error: {
  status: 400,  // <- tells us what went wrong
  data: { detail: "phone number invalid" },  // <- exact error
  message: "Request failed with status code 400"
}
```

### Step 4: Note the Status Code
- **201/200**: Success ✓
- **400**: Validation error (check field values)
- **401**: Auth error (re-login)
- **500**: Backend error (contact dev)
- **503**: Service unavailable (wait & retry)
- **Network Error**: Connection issue (check backend is running)

---

## Data Flow for Your Requests

### What Gets Sent:
```javascript
{
  customer_name: "Driver Name",        // From user.full_name
  service_type: "Other",              // Drivers now just describe
  location: "0.4500, 32.5800",        // GPS or manual
  description: "Flat tire on left",   // Driver's text description
  phone: "+256700123456",             // From user.phone
}
```

### Database Record Created:
```javascript
{
  id: "req_abc123",
  customer_name: "Driver Name",
  phone: "+256700123456",
  location: "0.4500, 32.5800",
  description: "Flat tire on left",
  status: "pending",                  // Changes as mechanic works
  created_at: "2026-01-27T10:30:00Z",
  updated_at: "2026-01-27T10:30:00Z"
}
```

### Status Lifecycle:
```
pending → accepted → in_progress → completed
  ↓
 (or)
  ↓
  cancelled
```

---

## Media Support (Voice, Photos, Files)

**Current Status:** UI ready, backend integration pending

To upload files, backend needs to:
1. Accept `multipart/form-data` instead of JSON
2. Store files in cloud storage (S3, Cloudinary, etc.)
3. Save file URLs in request record

Example backend implementation needed:
```python
@app.post("/requests/")
def create_request(
    customer_name: str,
    phone: str,
    location: str,
    description: str,
    service_type: str,
    files: List[UploadFile] = None  # NEW
):
    # Handle file uploads to cloud storage
    # Save URLs to database
    # Return request with file URLs
```

---

## Testing Checklist

- [ ] Submit request with all fields filled
- [ ] Check console for response status (201 = success)
- [ ] See success toast message
- [ ] Request appears in "Active Requests" (Home)
- [ ] Phone number is auto-filled correctly
- [ ] Location is GPS-detected automatically
- [ ] Can manually enter location if GPS fails
- [ ] Voice/photo buttons appear but don't upload yet (backend pending)

---

## Next Steps

**Backend Developer Tasks:**
1. Ensure requests are being created (check database)
2. Implement mechanic notification system
3. Add file upload support (voice notes, photos)
4. Implement real-time status updates (WebSocket or polling)
5. Create mechanic dashboard to view pending requests

**Frontend is Ready:** All features are implemented, just waiting for backend fixes!
