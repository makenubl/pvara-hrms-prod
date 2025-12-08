# Deploy to Vercel - Step-by-Step Guide

## 🚀 Quick Deploy (5 minutes)

### Step 1: Create MongoDB Atlas Account (Free)

1. Go to https://www.mongodb.com/cloud/atlas
2. Click **"Sign Up"** → Choose **Free** tier
3. Create account with email/password
4. Click **"Create"** on the "Create a cluster" page
5. Choose **M0 Free** tier (512MB)
6. Select region (closest to you)
7. Click **"Create Cluster"** (takes ~5 minutes)

### Step 2: Get MongoDB Connection String

1. In Atlas, click **"Connect"** button
2. Choose **"Drivers"** → **Node.js**
3. Copy the connection string
4. **Replace** `<username>` and `<password>` with actual credentials you created
5. **Replace** `myFirstDatabase` with `pvara-hrms`

**Example:**
```
mongodb+srv://ubl:MyPassword123@cluster0.mongodb.net/pvara-hrms
```

### Step 3: Deploy to Vercel

1. Go to https://vercel.com
2. Click **"Sign Up"** → Choose **GitHub**
3. Authorize Vercel to access your GitHub
4. Click **"Import Project"**
5. Paste repository URL: `https://github.com/makenubl/pvara-hrms`
6. Click **"Import"**

### Step 4: Add Environment Variables

In the Vercel dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add these variables:

```
MONGODB_URI = mongodb+srv://user:pass@cluster.mongodb.net/pvara-hrms
JWT_SECRET = your-super-secret-key-12345-change-this
NODE_ENV = production
REACT_APP_API_URL = https://your-app.vercel.app/api
```

3. Click **"Save"**

### Step 5: Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for build to complete
3. You'll see: **"Congratulations! Your site is live"** ✅

Your app will be live at: `https://your-vercel-username.vercel.app`

---

## 📋 Environment Variables Explained

| Variable | Value | Where to Get |
|----------|-------|--------------|
| `MONGODB_URI` | MongoDB connection string | MongoDB Atlas → Connect button |
| `JWT_SECRET` | Any random string (min 20 chars) | Create yourself (keep secret!) |
| `NODE_ENV` | `production` | Vercel auto-sets this |
| `REACT_APP_API_URL` | Your Vercel app URL + `/api` | After first deploy, copy your URL |

---

## 🔧 After Deployment

### Test Your API

1. Open https://your-app.vercel.app/api/health
   - Should return: `{"status":"ok"}`

2. Try register endpoint:
```bash
curl -X POST https://your-app.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Corp",
    "companyEmail": "company@test.com",
    "adminFirstName": "John",
    "adminLastName": "Doe",
    "adminEmail": "admin@test.com",
    "password": "Password123"
  }'
```

3. Try login:
```bash
curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Password123"
  }'
```

---

## ⚠️ Common Issues & Fixes

### Issue: "Internal Server Error" on API calls

**Solution:**
- Check MongoDB connection string is correct
- Make sure IP whitelist in MongoDB Atlas includes `0.0.0.0/0` (allow all)
- Verify `MONGODB_URI` is set in Vercel environment

### Issue: CORS errors in browser

**Solution:**
- Ensure `REACT_APP_API_URL` is set correctly
- Frontend URL should match Vercel deployment URL
- Backend already has CORS enabled

### Issue: "Module not found" errors

**Solution:**
- Check all imports use correct paths
- Verify `vercel.json` is in root directory
- Re-deploy by pushing to GitHub

### Issue: Build takes too long / times out

**Solution:**
- Delete `node_modules` locally: `rm -rf backend/node_modules`
- Push changes
- Vercel will reinstall dependencies
- Typical build time: 2-3 minutes

---

## 📊 Cost Breakdown

| Service | Tier | Cost |
|---------|------|------|
| **Vercel** | Free (Hobby) | $0 |
| **MongoDB Atlas** | M0 (Free) | $0 |
| **Custom Domain** (optional) | 1st year | Free via Vercel |
| **Total per month** | | **$0** |

**When to upgrade:**
- > 100GB bandwidth/month → Vercel Pro ($20/mo)
- > 512MB database → MongoDB M2 ($57/month)
- Need email support → Vercel Pro or Enterprise

---

## 🎯 What Gets Deployed

### Frontend (Static)
- React app built with Vite
- Served globally via Vercel CDN
- Fast load times worldwide

### Backend (Serverless)
- Express API
- Runs on Vercel Functions
- Auto-scales based on demand
- Pays only for execution time

### Database (Cloud)
- MongoDB Atlas
- Free tier: 512MB, good for 100K+ documents
- Auto-backups

---

## 🚀 Advanced: Custom Domain

1. Buy domain from Namecheap, GoDaddy, etc.
2. In Vercel: Settings → Domains
3. Enter your domain
4. Update nameservers to point to Vercel
5. Wait 24-48 hours for DNS to propagate
6. Your app will be at: `https://yourdomain.com`

---

## 📞 Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas Docs**: https://docs.mongodb.com/atlas
- **API Docs**: See `/backend/README.md` in your repo

---

**Status**: Ready to deploy! 🎉

Last Updated: December 9, 2025
