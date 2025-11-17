# Backend Tunneling Setup Guide

This guide shows how to expose your local backend server to the internet using tunneling services.

## Option 1: ngrok (Recommended - Most Popular)

### Installation:
```bash
# Download from https://ngrok.com/download
# Or use npm:
npm install -g ngrok
```

### Setup:
1. Sign up at https://ngrok.com (free account available)
2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
3. Configure ngrok:
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### Run:
```bash
# Start your backend server first
cd backend
npm start

# In a new terminal, start ngrok tunnel
ngrok http 5000
```

### Output:
You'll get a URL like: `https://abc123.ngrok-free.app`
- Use this URL in your app: `https://abc123.ngrok-free.app/api`

---

## Option 2: localtunnel (Simple - No Signup)

### Installation:
```bash
npm install -g localtunnel
```

### Run:
```bash
# Start your backend server first
cd backend
npm start

# In a new terminal, start localtunnel
lt --port 5000
```

### Output:
You'll get a URL like: `https://random-name.loca.lt`
- Use this URL in your app: `https://random-name.loca.lt/api`

### With Custom Subdomain:
```bash
lt --port 5000 --subdomain your-custom-name
```

---

## Option 3: cloudflared (Cloudflare Tunnel)

### Installation:
Download from: https://github.com/cloudflare/cloudflared/releases

### Run:
```bash
# Start your backend server first
cd backend
npm start

# In a new terminal, start cloudflared
cloudflared tunnel --url http://localhost:5000
```

### Output:
You'll get a URL like: `https://random-name.trycloudflare.com`
- Use this URL in your app: `https://random-name.trycloudflare.com/api`

---

## Option 4: serveo (SSH-based - No Installation)

### Run:
```bash
# Start your backend server first
cd backend
npm start

# In a new terminal, create tunnel
ssh -R 80:localhost:5000 serveo.net
```

### Output:
You'll get a URL like: `https://random-name.serveo.net`
- Use this URL in your app: `https://random-name.serveo.net/api`

---

## Quick Setup Script (ngrok)

Create a file `backend/start-tunnel.sh`:

```bash
#!/bin/bash
# Start backend and ngrok tunnel

# Start backend in background
npm start &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start ngrok
ngrok http 5000

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT
```

---

## Windows PowerShell Script

Create `backend/start-tunnel.ps1`:

```powershell
# Start backend and ngrok tunnel
Start-Process npm -ArgumentList "start" -NoNewWindow
Start-Sleep -Seconds 3
ngrok http 5000
```

---

## Important Notes:

1. **Free Tunnels**: Most free tunnels have limitations:
   - ngrok: URL changes on restart (unless paid)
   - localtunnel: URL changes on restart
   - cloudflared: URL changes on restart

2. **For Production**: Use a fixed domain with:
   - ngrok paid plan (fixed domain)
   - Deploy to cloud (AWS, Heroku, Railway, etc.)

3. **Security**: Tunnels expose your local server - use only for development/testing

4. **Update API URL**: After getting tunnel URL, update `ElderConnect/constants/api.ts`

