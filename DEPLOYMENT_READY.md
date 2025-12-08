# PVARA HRMS Production - Quick Reference

## 📍 Repository Locations

```
Development:    /Users/ubl/pvara-hrms          (Original - all 3 branches)
Production:     /Users/ubl/pvara-hrms-prod     (NEW - clean, dev-hrms-pvara only)
```

## 🚀 Ready for Vercel Deployment

**Location**: `/Users/ubl/pvara-hrms-prod`

This is a clean clone of the `dev-hrms-pvara` branch with:
- ✅ Frontend (React 19 + Vite + Tailwind)
- ✅ Backend (Express.js + MongoDB + JWT)
- ✅ Vercel configuration (vercel.json)
- ✅ Environment setup (.env.example, .env.vercel)
- ✅ Monorepo structure
- ✅ Deployment docs (VERCEL_DEPLOYMENT_GUIDE.md)

## 📋 What's Inside

### Frontend
- `/src` - React application (10+ HR pages)
- `/public` - Static assets
- `vite.config.js` - Vite build config
- `tailwind.config.js` - Tailwind CSS config

### Backend
- `/backend/models` - MongoDB schemas (5 models)
- `/backend/routes` - API endpoints (4 routes)
- `/backend/middleware` - Auth & RBAC
- `/backend/config` - Database config
- `/backend/api/index.js` - Vercel serverless entry point
- `/backend/server.js` - Local dev server

### Configuration
- `vercel.json` - Vercel deployment config
- `package.json` - Root npm scripts
- `.env.example` - Environment template
- `.env.vercel` - Vercel-specific template

## 🎯 Deploy to Vercel in 3 Steps

### 1. Create MongoDB Atlas Account (Free)
- Go to https://www.mongodb.com/cloud/atlas
- Create free cluster
- Get connection string

### 2. Import to Vercel
- Go to https://vercel.com/dashboard
- Click "Add New" → "Project"
- Click "Import Git Repository"
- Select: `pvara-hrms` repository
- Choose branch: `dev-hrms-pvara` (or it auto-selects)
- Click "Import"

### 3. Add Environment Variables & Deploy
In Vercel dashboard, add:
```
MONGODB_URI = mongodb+srv://user:pass@cluster.mongodb.net/pvara-hrms
JWT_SECRET = your-random-secret-key
NODE_ENV = production
```

Click "Deploy" → Wait 2-3 minutes → Done! 🎉

## 🔄 Development Workflow

### Local Setup
```bash
cd /Users/ubl/pvara-hrms-prod

# Install dependencies
npm install
npm run backend:install

# Run locally
npm run dev              # Frontend on port 5173
npm run backend:dev      # Backend on port 5000 (in another terminal)
```

### Make Changes
- Edit code in `/Users/ubl/pvara-hrms` (original)
- OR edit directly in `/Users/ubl/pvara-hrms-prod` (production clone)

### Push Updates
```bash
# From original repository
cd /Users/ubl/pvara-hrms
git add .
git commit -m "your message"
git push origin dev-hrms-pvara

# Then update production clone
cd /Users/ubl/pvara-hrms-prod
git pull origin dev-hrms-pvara
```

## 📊 Git Status

**Current branch**: dev-hrms-pvara
**Remote**: https://github.com/makenubl/pvara-hrms.git

To verify:
```bash
cd /Users/ubl/pvara-hrms-prod
git status
git log --oneline -5
```

## ⚠️ Important Notes

1. **This is a clean clone** - only contains `dev-hrms-pvara` branch code
2. **Still pulls from original repo** - changes to makenubl/pvara-hrms will affect this
3. **Not a new GitHub repo** - still uses makenubl/pvara-hrms as remote
4. **Can be updated anytime** - `git pull origin dev-hrms-pvara`

## 🔌 MongoDB Atlas Setup

1. Go to https://www.mongodb.com/cloud/atlas
2. Create account → Create cluster (M0 Free)
3. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/pvara-hrms`
4. Replace `username`, `password`, and `cluster` with your values
5. Copy to Vercel environment as `MONGODB_URI`

## 📞 Files Reference

| File | Purpose |
|------|---------|
| `VERCEL_DEPLOYMENT_GUIDE.md` | Detailed deployment instructions |
| `BACKEND_INTEGRATION_GUIDE.md` | Backend API documentation |
| `PROJECT_SUMMARY.md` | Complete project overview |
| `.env.example` | Development env template |
| `.env.vercel` | Production env template |
| `vercel.json` | Vercel build & deploy config |
| `deploy-vercel.sh` | Deployment helper script |

## ✅ Verification Checklist

- [ ] Clone created at `/Users/ubl/pvara-hrms-prod` ✓
- [ ] Git history preserved ✓
- [ ] vercel.json present ✓
- [ ] package.json configured ✓
- [ ] Backend directory with models & routes ✓
- [ ] MongoDB Atlas account created (TODO)
- [ ] Vercel account created (TODO)
- [ ] Environment variables set in Vercel (TODO)
- [ ] Deploy to Vercel (TODO)
- [ ] Test live deployment (TODO)

---

**Status**: Ready for Vercel deployment! 🚀

**Next**: Set up MongoDB Atlas, then import to Vercel
