# PVARA HRMS - Running with Docker MongoDB

## ✅ Current Status

All services are running successfully:

### Services Running
- **Frontend**: http://localhost:5173/
- **Backend**: http://localhost:5000
- **MongoDB**: Docker container `pvara-hrms-mongodb` on port 27017

## 🔐 Admin Login Credentials

```
Email:    admin@pvara.com
Password: admin123
```

## 🐳 Docker Commands

### View Running Containers
```bash
docker ps
```

### Stop MongoDB
```bash
docker-compose down
```

### Start MongoDB
```bash
docker-compose up -d mongodb
```

### View MongoDB Logs
```bash
docker logs pvara-hrms-mongodb
```

### Access MongoDB Shell
```bash
docker exec -it pvara-hrms-mongodb mongosh -u admin -p admin123
```

## 🚀 Starting the Application

### Start Everything
```bash
# Terminal 1 - Start MongoDB (if not running)
docker-compose up -d mongodb

# Terminal 2 - Start Backend
cd backend
npm run dev

# Terminal 3 - Start Frontend
npm run dev
```

### Stop Everything
```bash
# Stop Docker containers
docker-compose down

# Frontend and Backend will stop when you close terminals or press Ctrl+C
```

## 📊 Database Management

### List All Users
```bash
cd backend
node scripts/list-users.js
```

### Create/Reset Admin User
```bash
cd backend
node scripts/seed.js
```

## 🔧 Configuration Files

### Backend Environment (`.env`)
```
MONGODB_URI=mongodb://admin:admin123@localhost:27017/pvara-hrms?authSource=admin
JWT_SECRET=pvara-hrms-secret-key-2025
PORT=5000
NODE_ENV=development
```

### Docker Compose (`docker-compose.yml`)
- MongoDB with persistent volume
- Network configuration for container communication
- Credentials: admin/admin123

## 🐛 Troubleshooting

### Can't Login?
1. Check backend is running: http://localhost:5000
2. Check MongoDB container: `docker ps`
3. Check user exists: `node backend/scripts/list-users.js`

### MongoDB Not Connecting?
```bash
# Restart MongoDB container
docker-compose restart mongodb

# Check logs
docker logs pvara-hrms-mongodb
```

### Port Already in Use?
```bash
# Check what's using port 27017
netstat -ano | findstr :27017

# Stop all containers and restart
docker-compose down
docker-compose up -d mongodb
```

## 📝 Notes

- MongoDB data is persisted in Docker volume `pvara-hrms-prod_mongodb_data`
- Default admin password should be changed in production
- Frontend connects to backend at `http://localhost:5000/api`
