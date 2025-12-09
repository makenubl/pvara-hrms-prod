# 🔍 CHECK IF MONGODB IS RUNNING

MongoDB needs to be running for the backend to work. Here's how to check and start it:

---

## ✅ Quick Check: Is MongoDB Running?

### Option 1: Test via Backend Health Endpoint

Open your browser and go to:
```
http://localhost:5000/api/health
```

**Look for this response:**
```json
{
  "message": "Server is running",
  "mongodb": "connected",
  "timestamp": "2025-12-09T..."
}
```

**If you see:**
- ✅ `"mongodb": "connected"` → **MongoDB IS running** ✅
- ❌ `"mongodb": "disconnected"` → **MongoDB NOT running** ❌ Start it below
- ⚠️ Response doesn't show mongodb field → Update to latest code

---

## 🚀 START MONGODB

### On macOS:

**If using Homebrew:**
```bash
# Start MongoDB service
brew services start mongodb-community

# Or run in foreground (to see logs)
mongod
```

**If using Docker:**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**If installed locally:**
```bash
# Find where MongoDB is installed
which mongod

# Start it
/usr/local/bin/mongod
```

---

### On Windows:

**If using MongoDB Service:**
```bash
net start MongoDB
```

**Or start manually:**
```bash
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
```

---

### On Linux:

```bash
# Start MongoDB service
sudo systemctl start mongod

# Or run in foreground
mongod
```

---

## ⏸️ STOP MONGODB (If needed)

```bash
# macOS
brew services stop mongodb-community

# Or press Ctrl+C if running in terminal

# Linux
sudo systemctl stop mongod
```

---

## ✔️ Verify MongoDB is Running

### Check 1: MongoDB Port is Listening
```bash
# Check if port 27017 is open (MongoDB default port)
lsof -i :27017
```

Should show something like:
```
mongod ... (LISTEN)
```

### Check 2: Can Connect to MongoDB
```bash
# Try to connect with mongo CLI
mongosh
# or older version:
mongo
```

If you see:
```
> 
```

Then MongoDB is running! Type `exit` to quit.

### Check 3: Check Health Endpoint Again
```
http://localhost:5000/api/health
```

Should now show:
```json
{
  "mongodb": "connected"
}
```

---

## 🎯 What You Need

For PVARA HRMS to work:
- ✅ Node.js installed
- ✅ npm installed
- ✅ **MongoDB running** (this is critical!)
- ✅ Backend server running (`npm start` in /backend)
- ✅ Frontend server running (`npm run dev` in root)

---

## 🆘 TROUBLESHOOTING

**MongoDB won't start:**
1. Check if it's already running: `lsof -i :27017`
2. If port 27017 is in use, kill it: `kill -9 $(lsof -t -i :27017)`
3. Try starting again

**MongoDB keeps stopping:**
1. Check logs: Look for error messages in terminal
2. Verify installation is correct
3. Reinstall if needed

**Connection refused error:**
1. MongoDB isn't running
2. Wrong connection string in .env
3. Check MONGODB_URI in backend/.env

---

## ✅ CURRENT STATUS

**MongoDB Connection String in backend/.env:**
```
MONGODB_URI=mongodb://localhost:27017/pvara-hrms
```

This assumes MongoDB is running on:
- **Host:** localhost (your computer)
- **Port:** 27017 (MongoDB default)
- **Database:** pvara-hrms

---

## 📋 CHECKLIST

Before running tests:

- [ ] MongoDB service started (check `brew services` or see running processes)
- [ ] MongoDB port 27017 is listening
- [ ] Backend health check shows `"mongodb": "connected"`
- [ ] Both backend and frontend servers running
- [ ] Can open http://localhost:5174 in browser

---

## 🎬 NEXT STEPS

1. **Check if MongoDB is running:**
   ```
   http://localhost:5000/api/health
   ```

2. **If NOT connected, start it:**
   ```bash
   mongod
   # or brew services start mongodb-community (macOS)
   ```

3. **Once running, verify:**
   ```
   http://localhost:5000/api/health
   # Should show "mongodb": "connected"
   ```

4. **Then run your tests!**

---

Let me know what you see in the health endpoint! 🔍
