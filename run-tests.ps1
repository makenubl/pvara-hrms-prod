# PVARA HRMS - System Test Script

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PVARA HRMS - System Tests" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: MongoDB Container
Write-Host "Test 1: MongoDB Container Status" -ForegroundColor Yellow
$mongoContainer = docker ps --filter "name=pvara-hrms-mongodb" --format "{{.Status}}"
if ($mongoContainer -like "*Up*") {
    Write-Host "PASS: MongoDB container is running" -ForegroundColor Green
    Write-Host "Status: $mongoContainer`n" -ForegroundColor Gray
} else {
    Write-Host "FAIL: MongoDB container is NOT running" -ForegroundColor Red
    Write-Host "Fix: docker-compose up -d mongodb`n" -ForegroundColor Yellow
}

# Test 2: Backend Health
Write-Host "Test 2: Backend API Health" -ForegroundColor Yellow
try {
    $health = curl.exe -s http://localhost:5000/api/health | ConvertFrom-Json
    Write-Host "PASS: Backend is running" -ForegroundColor Green
    Write-Host "MongoDB: $($health.mongodb)" -ForegroundColor Gray
    Write-Host "Timestamp: $($health.timestamp)`n" -ForegroundColor Gray
} catch {
    Write-Host "FAIL: Backend is NOT responding" -ForegroundColor Red
    Write-Host "Fix: cd backend; node server.js`n" -ForegroundColor Yellow
}

# Test 3: Frontend
Write-Host "Test 3: Frontend Status" -ForegroundColor Yellow
try {
    $frontend = curl.exe -s http://localhost:5173 -I
    if ($frontend -match "200 OK") {
        Write-Host "PASS: Frontend is running at http://localhost:5173/`n" -ForegroundColor Green
    } else {
        Write-Host "FAIL: Frontend returned unexpected status`n" -ForegroundColor Red
    }
} catch {
    Write-Host "FAIL: Frontend is NOT responding" -ForegroundColor Red
    Write-Host "Fix: npm run dev`n" -ForegroundColor Yellow
}

# Test 4: Login API
Write-Host "Test 4: Login API Endpoint" -ForegroundColor Yellow
try {
    $loginResponse = curl.exe -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@pvara.com","password":"admin123"}' | ConvertFrom-Json
    
    if ($loginResponse.token) {
        Write-Host "PASS: Login API working correctly" -ForegroundColor Green
        Write-Host "User: $($loginResponse.user.firstName) $($loginResponse.user.lastName)" -ForegroundColor Gray
        Write-Host "Email: $($loginResponse.user.email)" -ForegroundColor Gray
        Write-Host "Role: $($loginResponse.user.role)" -ForegroundColor Gray
        Write-Host "Token: $($loginResponse.token.Substring(0,50))..." -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "FAIL: Login failed - no token returned`n" -ForegroundColor Red
    }
} catch {
    Write-Host "FAIL: Login API test failed" -ForegroundColor Red
    Write-Host "Error: $_`n" -ForegroundColor Yellow
}

# Test 5: Database Users
Write-Host "Test 5: Database Users" -ForegroundColor Yellow
try {
    $usersOutput = node backend/scripts/list-users.js 2>&1
    $usersText = $usersOutput -join "`n"
    if ($usersText -match "admin@pvara") {
        Write-Host "PASS: Admin user exists in database`n" -ForegroundColor Green
    } else {
        Write-Host "FAIL: Admin user not found" -ForegroundColor Red
        Write-Host "Fix: node backend/scripts/seed.js`n" -ForegroundColor Yellow
    }
} catch {
    Write-Host "FAIL: Could not check database users`n" -ForegroundColor Red
}

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Login Credentials:" -ForegroundColor White
Write-Host "Email: admin@pvara.com" -ForegroundColor Cyan
Write-Host "Password: admin123" -ForegroundColor Cyan
Write-Host ""

Write-Host "Application URLs:" -ForegroundColor White
Write-Host "Frontend: http://localhost:5173/" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:5000/" -ForegroundColor Cyan
Write-Host ""

Write-Host "Troubleshooting Browser Login Issues:" -ForegroundColor Yellow
Write-Host "1. Open browser console (F12) for errors" -ForegroundColor Gray
Write-Host "2. Clear browser cache and localStorage" -ForegroundColor Gray
Write-Host "3. Try in incognito/private window" -ForegroundColor Gray
Write-Host "4. Check Network tab for failed API calls" -ForegroundColor Gray
Write-Host "5. Verify API URL in browser DevTools" -ForegroundColor Gray
Write-Host ""
