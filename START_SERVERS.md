# 🚀 START BOTH SERVERS - COMMANDS

The servers are already running, but here are the commands if you need to restart them:

## Option 1: Start Both Servers (Recommended)

### Terminal 1 - Backend Server
```bash
cd /Users/ubl/pvara-hrms-prod/backend
npm start
```

Expected output:
```
Server is running on port 5000
MongoDB connected
```

### Terminal 2 - Frontend Server  
```bash
cd /Users/ubl/pvara-hrms-prod
npm run dev
```

Expected output:
```
VITE v7.2.7  ready in 500 ms

➜  Local:   http://localhost:5174/
```

---

## Option 2: Quick Start (One Command - Root Directory)

From the root directory `/Users/ubl/pvara-hrms-prod`:

```bash
# This will build and start backend in dev mode
npm run backend:dev
```

Then in another terminal:
```bash
npm run dev
```

---

## ✅ VERIFICATION

Once both are running:

1. **Backend Health Check:**
   ```bash
   curl http://localhost:5000/api/health
   ```
   Should return:
   ```json
   {"message":"Server is running","mongodb":"connected","timestamp":"2025-12-09T..."}
   ```

2. **Frontend Check:**
   - Open browser to http://localhost:5174
   - Should see login page

---

## Current Status

✅ Both servers are currently running and responding:
- Backend: http://localhost:5000 ✅
- Frontend: http://localhost:5174 ✅
- MongoDB: Connected ✅

---

## Next Steps

Once servers are confirmed running:
1. Open http://localhost:5174 in browser
2. Follow the 9-step testing guide in SYSTEM_CHECK_GUIDE.md
3. Test login, add employee, refresh to verify persistence
4. Report results back

---

## Troubleshooting

**If backend won't start:**
- Check MongoDB is running: `mongod` in separate terminal
- Check port 5000 is free: `lsof -i :5000`
- Check .env file has MONGODB_URI: `cat backend/.env`

**If frontend won't start:**
- Check port 5174 is free: `lsof -i :5174`
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Vite is installed: `npm ls vite`

**If MongoDB won't connect:**
- Ensure MongoDB service is running
- Check connection string in backend/.env
- Local: `mongodb://localhost:27017/pvara-hrms`

---

Ready to start? Let me know!
