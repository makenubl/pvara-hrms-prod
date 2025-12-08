# PVARA HRMS - Production

**Premium HR Management System with Glassmorphic UI**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

---

## 🚀 Quick Deploy (Free)

1. **MongoDB Atlas** - Create free cluster at https://cloud.mongodb.com
2. **Import to Vercel** - https://vercel.com/new
3. **Add Environment Variables**:
   ```
   MONGODB_URI = mongodb+srv://user:pass@cluster.mongodb.net/pvara-hrms
   JWT_SECRET = your-random-secret-key
   NODE_ENV = production
   ```
4. **Deploy** - Click deploy and wait 2-3 minutes ✅

**Cost: $0/month** (Vercel + MongoDB free tiers)

---

## ✨ Features

- 10+ HR modules (Employee, Leave, Payroll, Analytics, etc.)
- Premium glassmorphic dark UI with Tailwind CSS
- Complete REST API with JWT authentication
- Role-based access control (Admin, HR, Manager, Employee)
- Multi-level approval workflows
- Organization hierarchy management

---

## 🛠️ Tech Stack

**Frontend:** React 19 + Vite + Tailwind CSS + Zustand  
**Backend:** Express.js + MongoDB + JWT + bcryptjs  
**Deployment:** Vercel (serverless) + MongoDB Atlas

---

## 📚 Documentation

- [Deployment Guide](./VERCEL_DEPLOYMENT_GUIDE.md)
- [Project Summary](./PROJECT_SUMMARY.md)
- [Backend API Docs](./BACKEND_INTEGRATION_GUIDE.md)

---

## 🏃 Local Development

```bash
# Install
npm install && npm run backend:install

# Configure
cp .env.example .env
# Edit .env with your values

# Run
npm run dev              # Frontend: http://localhost:5173
npm run backend:dev      # Backend: http://localhost:5000
```

---

**Made with ❤️ for efficient HR management**
