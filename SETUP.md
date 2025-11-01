# AssemblyNetwork Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
cd ~/assemblynetwork
npm install
```

### 2. Configure Redis (Activity Logging)

**Option A: Use Shared Trinity Redis** (Recommended if you have `~/..env`)

```bash
# Copy credentials from home .env
cp .env.example .env

# Then manually add the token from ~/..env:
# UPSTASH_REDIS_REST_URL=https://loyal-lamb-40648.upstash.io
# UPSTASH_REDIS_REST_TOKEN=<your_token_from_home_env>
```

**Option B: Create New Upstash Redis**

1. Go to https://console.upstash.com/
2. Create free Redis database
3. Copy REST URL and Token
4. Update `.env`:
```bash
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

### 3. Start Server
```bash
npm start
# Server runs on http://0.0.0.0:9000
```

### 4. Access Dashboard
- **Local**: http://localhost:9000
- **Network**: http://192.168.7.241:9000 (replace with your IP)

---

## Features Enabled

### With Redis Token:
✅ Network scanning
✅ Activity logging with timestamps
✅ Persistent event storage
✅ Historical queries

### Without Redis Token:
✅ Network scanning
⚠️ Activity logging disabled
⚠️ No persistence (data lost on restart)

---

## Current Configuration

**Redis Instance**: `loyal-lamb-40648.upstash.io` (shared Trinity Redis)
**Activity Logging**: ✅ **ENABLED**
**Features**: All enabled (networkScanning, activityLogging, redisStorage)

---

## Verify Setup

```bash
# Check server status
curl http://localhost:9000/api/status

# Should show:
# "activityLogging": true,
# "redisStorage": true
```

---

## Redis Activity Storage

Events are stored with pattern:
```
network_activity:2025-11-01:uuid-v4
```

Retrieve activity:
```bash
# Get recent activity
curl http://localhost:9000/api/activity?limit=50

# Get specific date
curl http://localhost:9000/api/activity?date=2025-11-01
```

---

**♠️🌿🎸🧵 Ready to discover your network!**
