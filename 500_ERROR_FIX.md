# 🔧 500 ERROR TROUBLESHOOTING GUIDE

**Error:** `Failed to load resource: the server responded with a status of 500 (Internal Server Error)`

---

## ✅ FIXES APPLIED

I've added better error handling and debugging to help identify the issue:

### 1. **Company Validation** ✅
- Added checks for `req.user.company` in employee and position routes
- Better error messages if company is missing from JWT token

### 2. **Error Logging** ✅
- Added console logs to see exact error messages
- Backend will now show detailed errors in terminal

### 3. **Debug Endpoints** ✅
- `/api/health` - Check if MongoDB is connected
- `/api/debug/auth` - Test if authentication and company field are working

---

## 🔍 DEBUGGING STEPS

### Step 1: Check Backend Terminal
Look at your backend terminal (where you ran `npm run backend:dev`) and check for error messages starting with `❌`

### Step 2: Test Health Endpoint
Open browser or use curl:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "message": "Server is running",
  "mongodb": "connected",
  "timestamp": "2025-12-09T..."
}
```

If `mongodb: "disconnected"`, restart MongoDB:
```bash
brew services restart mongodb-community
# or
mongod
```

### Step 3: Test Authentication
In browser console, run:
```javascript
fetch('http://localhost:5000/api/debug/auth', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(console.log)
```

Expected response:
```json
{
  "message": "Authentication working",
  "user": {
    "_id": "...",
    "email": "user@example.com",
    "role": "admin",
    "company": "company_id_here"  // ← THIS MUST EXIST
  }
}
```

### Step 4: Check Token in LocalStorage
In browser console:
```javascript
const token = localStorage.getItem('token');
if (!token) {
  console.log('❌ No token found - Please login');
} else {
  // Decode JWT (middle part)
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token payload:', payload);
  // Should see: _id, email, role, company
}
```

---

## 🐛 COMMON CAUSES

### 1. **Not Logged In**
**Symptom:** No token in localStorage  
**Solution:** Navigate to `/login` and log in with your credentials

### 2. **Token Missing Company Field**
**Symptom:** Token exists but `company` field is undefined  
**Solution:** Login was created before company field was added to JWT. **Re-login** to get new token.

### 3. **MongoDB Not Running**
**Symptom:** `/api/health` shows `mongodb: "disconnected"`  
**Solution:** 
```bash
brew services start mongodb-community
# or
mongod --dbpath /usr/local/var/mongodb
```

### 4. **Backend Not Running**
**Symptom:** Cannot reach `http://localhost:5000`  
**Solution:**
```bash
cd backend
npm run dev
```

### 5. **No Positions in Database**
**Symptom:** AddEmployeeModal position dropdown is empty  
**Solution:** Need to seed positions first (see below)

---

## 🌱 SEEDING DATA (If Database is Empty)

### Create Test Position
In MongoDB shell or Compass:
```javascript
// First, get your company ID from a user document
db.users.findOne({}, {company: 1})

// Then create a position
db.positions.insertOne({
  title: "Software Engineer",
  department: "Technology",
  description: "Develops software applications",
  level: "mid",
  salary_range_min: 60000,
  salary_range_max: 90000,
  status: "active",
  company: ObjectId("YOUR_COMPANY_ID_HERE"),
  createdAt: new Date(),
  updatedAt: new Date()
})
```

Or use API (after fixing auth):
```bash
curl -X POST http://localhost:5000/api/positions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Software Engineer",
    "department": "Technology",
    "level": "mid",
    "salary_range_min": 60000,
    "salary_range_max": 90000
  }'
```

---

## 🔄 QUICK FIX CHECKLIST

1. ✅ Check backend terminal for error messages
2. ✅ Test `/api/health` endpoint
3. ✅ Test `/api/debug/auth` endpoint
4. ✅ Verify token has `company` field
5. ✅ If no company in token → **Re-login**
6. ✅ Check MongoDB is running
7. ✅ Verify backend is running on port 5000
8. ✅ Check browser console for network errors
9. ✅ Look at Network tab → Failed request → Preview/Response

---

## 🚀 NEXT STEPS

**Please do this:**
1. Check your backend terminal for error messages
2. Copy and paste any red errors you see
3. Test the health endpoint: http://localhost:5000/api/health
4. Tell me what you see

Then I can give you the exact fix!

---

**Most Likely Fix:** You need to **re-login** to get a new JWT token that includes the `company` field.
