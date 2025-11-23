# Backend Server Start Guide (Tamil/English)

## 🚀 Server Start பண்ணுவது எப்படி?

### Method 1: PowerShell Script (Easiest)
```powershell
cd backend
.\start-server.ps1
```

### Method 2: Manual Start
```powershell
cd backend
npm start
```

### Method 3: Development Mode (Auto-restart)
```powershell
cd backend
npm run dev
```

---

## ⚠️ Common Errors & Solutions

### Error 1: Port 5000 Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Fix:**
```powershell
# Port 5000-ஐ free செய்ய
Get-NetTCPConnection -LocalPort 5000 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }

# அல்லது அனைத்து Node processes-ஐ kill செய்ய
Get-Process -Name node | Stop-Process -Force
```

### Error 2: MongoDB Connection Failed
```
❌ MongoDB connection error
```

**Fix:**
1. MongoDB service start செய்ய
2. `.env` file-ல் `MONGODB_URI` check செய்ய

### Error 3: Module Not Found
```
Error: Cannot find module 'express'
```

**Fix:**
```powershell
cd backend
npm install
```

### Error 4: Missing .env File
**Fix:**
```powershell
cd backend
Copy-Item ENV_EXAMPLE.txt .env
# Then edit .env with your values
```

---

## ✅ Success Message

Server successfully start ஆனால் இப்படி show ஆகும்:
```
✅ MongoDB connected successfully
🚀 ElderConnect API server running on port 5000
📱 Environment: development
```

---

## 🔍 Server Running-ஐ Check செய்ய

```powershell
# Port check
Get-NetTCPConnection -LocalPort 5000

# Browser-ல் open
# http://localhost:5000/api/health
```

---

## 📝 Quick Commands

```powershell
# 1. Backend folder-க்கு போ
cd backend

# 2. Dependencies install (முதல் முறை மட்டும்)
npm install

# 3. Existing server-ஐ stop செய்ய
Get-Process -Name node | Stop-Process -Force

# 4. Server start
npm start
```

