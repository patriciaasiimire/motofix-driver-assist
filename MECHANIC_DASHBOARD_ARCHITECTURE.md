# 📱 Mechanic Dashboard Architecture & Data Flow

## Current Data Flow (What's Being Sent)

### When Driver Submits Request:

**Data Sent to Backend:**
```javascript
{
  customer_name: "Driver Name",        // From user profile
  phone: "+256700123456",              // From user profile
  location: "0.4500, 32.5800",         // GPS coordinates or manual
  description: "Flat tire on left",    // Driver's text description
  service_type: "Other",               // Default (drivers describe instead)
  created_at: "2026-01-27T10:30:00Z"   // Timestamp
}
```

**Media Files (NOT YET SENT - Backend Needs Update):**
```javascript
{
  voice_notes: [],      // Array of audio files
  photos: [],          // Array of image files
  documents: []        // Array of other files
}
```

**Status:** ✅ Text data arrives at backend
**Status:** ⏳ Media files ready on frontend but backend needs FormData support

---

## Backend Architecture Needed

### Phase 1: Request Storage (CURRENT)
```
Driver App                    Backend                    Database
    |                            |                           |
    |-- Submit Request --------->|                           |
    |                            |-- Save to DB ------------->|
    |                            |                           |
    |<-- Confirmation ----------|<-- Request ID -------------|
```

### Phase 2: Mechanic Notification (NOT YET)
```
Driver App       Backend          SMS Service        Mechanics
    |               |                   |               |
    |-- Request --->|-- Check Busy ---->|              |
    |               |                   |              |
    |               |-- Send SMS -------+----- Hello, new breakdown ---|
    |               |                                  |
    |               |<-- Mechanic opens request ------>|
```

### Phase 3: Real-Time Updates (NOT YET)
```
Mechanic Dashboard           Backend              Driver App
       |                        |                     |
       |-- Accept request ----->|                     |
       |                        |-- Status Update ------>|
       |                        |   (status: accepted)
       |
       |-- Update Status ------>|
       |   (status: in_progress)|-- Notify Driver ------>|
```

---

## What You Need to Build

### For Backend/Admin:

#### 1. **Request Storage & Retrieval**
```python
# Backend needs to handle:
POST /requests/                    # Create request (DONE)
GET /requests/                     # Get all requests
GET /requests/{id}                 # Get single request
PATCH /requests/{id}/status        # Update status
GET /requests/pending              # Get pending requests
GET /requests/mechanic/{id}        # Get mechanics assigned requests
```

#### 2. **Mechanic Assignment System**
```python
# Assign mechanics to requests
POST /requests/{id}/assign         # Assign to mechanic
POST /requests/{id}/accept         # Mechanic accepts
PATCH /requests/{id}/status        # Update: in_progress, completed

# Mechanic information
GET /mechanics/                    # List all mechanics
GET /mechanics/{id}/active-requests
GET /mechanics/{id}/location
```

#### 3. **File/Media Upload Support**
```python
# Update endpoint to handle FormData
POST /requests/                    # Modified to accept:
- customer_name (text)
- phone (text)
- location (text)
- description (text)
- voice_notes (file array)        # NEW
- photos (file array)             # NEW
- documents (file array)          # NEW

# Save to cloud storage:
- AWS S3
- Google Cloud Storage
- Cloudinary
- Firebase Storage

# Return URLs in response:
{
  id: "req_123",
  customer_name: "...",
  voice_notes: [
    { url: "https://storage.../audio1.webm", duration: 45 }
  ],
  photos: [
    { url: "https://storage.../photo1.jpg", size: "2.5MB" }
  ]
}
```

#### 4. **Admin Dashboard Features**
```
Admin should see:
├─ All Requests (list view)
│  ├─ Request ID
│  ├─ Driver name & phone
│  ├─ Location & GPS
│  ├─ Issue description
│  ├─ Status (pending, accepted, in_progress, completed)
│  ├─ Created time
│  └─ Voice notes, photos, files
│
├─ Request Details
│  ├─ Full issue description
│  ├─ Play voice notes
│  ├─ View photos/documents
│  ├─ Assign to mechanic
│  └─ Update status
│
├─ Mechanics Management
│  ├─ List mechanics
│  ├─ Active/completed requests count
│  ├─ Current location
│  ├─ Availability status
│  └─ Performance stats
│
└─ Reports
   ├─ Total requests
   ├─ Completed today
   ├─ Average response time
   └─ Mechanic performance
```

---

## Do Mechanics Need Their Own App?

### Option 1: Mobile App (Recommended for Mechanics)
**Pros:**
- Push notifications in real-time
- Can work offline (local cache)
- Better GPS integration
- Native performance
- Can start/stop work status easily

**Cons:**
- Requires development & maintenance
- App store deployment
- Users must install & update

**What it would do:**
```
Mechanic opens app:
├─ See pending requests near their location
├─ Accept/Decline request
├─ Get navigation to customer
├─ Start work timer
├─ Take photos of breakdown
├─ Update status
├─ Mark complete
└─ Get paid/rated
```

---

### Option 2: Web Dashboard (What You Should Start With)
**Pros:**
- No installation needed
- Works on any device
- Easier to develop
- Single codebase (responsive design)
- Easier to deploy updates

**Cons:**
- Requires internet connection
- Push notifications harder to implement
- Less native feel

**What it would show:**
```
Mechanic logs into web browser:
├─ Dashboard with pending requests
│  ├─ Sort by: distance, time, status
│  ├─ Each request card shows:
│  │  ├─ Customer photo/name
│  │  ├─ Issue description
│  │  ├─ Voice note player
│  │  ├─ Photos gallery
│  │  └─ GPS map
│  │
│  └─ Quick actions:
│     ├─ Accept
│     ├─ Decline
│     └─ Details
│
├─ Active Request View
│  ├─ Full issue details
│  ├─ Photos & voice notes
│  ├─ Start/Pause/Complete buttons
│  ├─ Take photos of work
│  ├─ Add notes
│  └─ Mark complete
│
└─ History
   ├─ Completed requests
   ├─ Ratings received
   └─ Earnings
```

---

## Recommended Architecture

### Phase 1: Admin Web Dashboard (Start Here)
```
┌─────────────────────────────────────┐
│         Admin Dashboard             │
│  (Web - React/Vue/Next.js)          │
│                                     │
│  ├─ Requests List View              │
│  ├─ Request Details                 │
│  ├─ Media Preview                   │
│  ├─ Mechanic Assignment             │
│  └─ Status Updates                  │
└─────────────────────────────────────┘
              ↓
     Backend API (Done!)
              ↓
    ┌─────────────────────┐
    │  Driver App (Done!) │
    │                     │
    │  ├─ Create Request  │
    │  ├─ View Status     │
    │  ├─ Media Upload    │
    │  └─ History         │
    └─────────────────────┘
```

### Phase 2: Mechanic Web Dashboard
```
┌──────────────────────────────────┐
│     Mechanic Dashboard           │
│   (Web - Same Frontend)          │
│                                  │
│  ├─ Pending Requests             │
│  ├─ Accept/Decline               │
│  ├─ Work in Progress             │
│  ├─ Complete & Get Paid          │
│  └─ Ratings/History              │
└──────────────────────────────────┘
              ↓
     Backend API (Update Needed!)
```

### Phase 3: Mechanic Mobile App (Later)
```
Same as web dashboard but:
├─ Native app experience
├─ Push notifications
├─ Better GPS
├─ Offline support
└─ App store deployment
```

---

## Data Flow with Admin Dashboard

### Complete Request Lifecycle:

```
1. DRIVER SUBMITS
   └─ App sends: customer, location, issue, media to Backend

2. BACKEND CREATES
   └─ DB stores request with status="pending"

3. ADMIN SEES
   └─ Admin Dashboard shows new pending request
   └─ Can preview: description, voice notes, photos

4. ADMIN ASSIGNS TO MECHANIC
   └─ Backend updates: mechanic_id, assigned_at
   └─ (Optional: SMS to mechanic)

5. MECHANIC SEES
   └─ Mechanic Dashboard/App shows new assignment
   └─ (If app: gets push notification)

6. MECHANIC ACCEPTS
   └─ Backend updates: status="accepted", accepted_at

7. DRIVER SEES
   └─ Driver App updates: Status = "Mechanic Accepted"
   └─ Driver might see mechanic name/location

8. MECHANIC STARTS WORK
   └─ Mechanic updates: status="in_progress"

9. DRIVER SEES
   └─ Driver App updates: Status = "In Progress"

10. MECHANIC COMPLETES
    └─ Mechanic updates: status="completed"
    └─ Takes photos of fixed bike

11. DRIVER SEES
    └─ Driver App updates: Status = "Completed"
    └─ Can see mechanic's photos/notes
    └─ Can rate mechanic

12. PAYMENT
    └─ Backend calculates mechanic payment
    └─ Admin dashboard shows earnings
```

---

## Current Status & What's Missing

### ✅ Already Working:
- Driver app request creation
- Location detection
- Media capture (voice, photos, files)
- Frontend preview/playback

### ⏳ Needs Backend Update:
- File upload to cloud storage
- Media file storage & retrieval
- Mechanic assignment system

### ❌ Not Yet Built:
- Admin Dashboard (web)
- Mechanic Dashboard (web or app)
- Notification system
- Real-time status updates
- Payment system
- Rating system

---

## Recommended Next Steps

1. **Update Backend to Accept Media**
   - Add FormData support
   - Setup cloud storage (S3/Cloudinary)
   - Test file upload

2. **Build Admin Dashboard**
   - React/Vue app similar to driver app
   - Show requests with media preview
   - Assign to mechanics

3. **Test End-to-End**
   - Driver creates request with media
   - Admin sees it with preview
   - Admin assigns to mechanic

4. **Build Mechanic Dashboard**
   - Show pending requests
   - Accept/decline
   - Update status

5. **Add Real-Time Updates**
   - WebSocket or polling
   - Push notifications
   - Status sync

6. **Deploy & Monitor**
   - Set up databases
   - Monitor API performance
   - Track request flow

---

## Tech Stack Recommendation

| Component | Technology | Why |
|-----------|-----------|-----|
| Driver App | React (Current) | ✅ Already working |
| Admin Dashboard | React/Next.js | Easy to build, code sharing |
| Mechanic Dashboard | React/Next.js | Same as admin |
| Backend | FastAPI/Node.js | Handle file uploads, assign |
| Database | PostgreSQL | Reliable, relational data |
| File Storage | AWS S3 or Cloudinary | Reliable, scalable |
| Real-time | Socket.io/WebSocket | Live status updates |
| Notifications | Twilio/Firebase | SMS & push notifications |
| Payments | Stripe/Mpesa | Mechanic earnings |

---

## Budget Estimate

| Phase | Component | Cost |
|-------|-----------|------|
| 1 | Backend File Upload | $500-1000 (dev time) |
| 1 | Admin Dashboard | $1000-2000 (dev time) |
| 2 | Mechanic Web Dashboard | $1000-2000 (dev time) |
| 2 | Real-time Updates | $500-1000 (dev time) |
| 3 | Mechanic Mobile App | $2000-5000 (dev time) |
| 3 | Cloud Storage | $50-200/month |
| 3 | Notifications | $20-100/month |

---

## Bottom Line

**Do mechanics need their own app?**

✅ **Short answer:** No, start with web dashboard
- Admin dashboard for request management
- Mechanic web dashboard to view & manage requests
- Mobile app can come later

The driver app is complete and works. Focus on:
1. Backend file upload support
2. Admin dashboard to manage requests
3. Mechanic dashboard to accept/complete work
4. Real-time status updates between all three

The current architecture is sound - you just need to connect the three dashboards together!
