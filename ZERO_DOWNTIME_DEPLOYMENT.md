# Zero-Downtime Deployment Guide

## Problem
Restarting the backend interrupts live trading sessions, WebSocket connections, and position tracking.

## Solution: Blue-Green Deployment with PM2

### Architecture
- **Port 5000**: Production (Live Trading)
- **Port 5001**: Staging (Testing New Code)
- **Nginx**: Routes traffic based on readiness

---

## Setup Instructions

### 1. Install Nginx (if not already)
```bash
sudo apt install nginx -y
```

### 2. Configure Nginx Reverse Proxy
```bash
sudo nano /etc/nginx/sites-available/merqprime
```

Paste this configuration:
```nginx
upstream backend {
    server 127.0.0.1:5000 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:5001 backup;
}

server {
    listen 80;
    server_name api.merqprime.in;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # WebSocket support
        proxy_read_timeout 86400;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/merqprime /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. PM2 Ecosystem Configuration
Create `ecosystem.config.js` in `~/merq/backend-node/`:

```javascript
module.exports = {
  apps: [
    {
      name: 'merq-production',
      script: 'server.js',
      cwd: '/home/ubuntu/merq/backend-node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    },
    {
      name: 'merq-staging',
      script: 'server.js',
      cwd: '/home/ubuntu/merq/backend-node',
      instances: 1,
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: 'staging',
        PORT: 5001
      }
    }
  ]
};
```

Start both instances:
```bash
cd ~/merq/backend-node
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

---

## Deployment Workflow (For Your Friend)

### When Updating Code:

#### Step 1: Deploy to Staging
```bash
# SSH to server
ssh -i "merq-key.pem" ubuntu@3.110.30.136

# Pull latest code
cd ~/merq
git pull origin master

# Install dependencies (if needed)
cd backend-node
npm install

# Restart ONLY staging
pm2 restart merq-staging
```

#### Step 2: Test Staging
Visit `http://api.merqprime.in:5001/` to verify the new code works.

#### Step 3: Graceful Swap (Zero Downtime)
```bash
# Reload production with new code (graceful restart)
pm2 reload merq-production

# OR if you need hard restart:
# Wait for market close (3:30 PM)
pm2 restart merq-production
```

---

## Alternative: Hot-Reload for Development

For non-breaking changes (like adding new routes), use PM2's reload:

```bash
# This does rolling restart - keeps at least 1 instance alive
pm2 reload merq-production
```

**Note**: This only works if you have `instances: 2` or more in cluster mode.

---

## Best Practices

### ✅ DO:
1. **Deploy during market closed hours** (after 3:30 PM IST)
2. **Test on staging first** (Port 5001)
3. **Use `pm2 reload`** for minor updates
4. **Check `pm2 logs`** after deployment
5. **Keep a rollback plan**: `git checkout <previous-commit>`

### ❌ DON'T:
1. **Never restart during market hours** (9:15 AM - 3:30 PM)
2. **Don't deploy untested code to production**
3. **Don't restart if active positions exist** (check dashboard first)

---

## Emergency Rollback

If new deployment breaks:
```bash
cd ~/merq
git log --oneline -5  # Find previous commit hash
git checkout <commit-hash>
pm2 restart merq-production
```

---

## Monitoring Active Sessions

Before restarting, check if trading is active:
```bash
# Check if any users have active sessions
curl http://localhost:5000/status

# Check PM2 logs
pm2 logs merq-production --lines 50
```

If output shows active positions or WebSocket connections, **WAIT** until market closes.

---

## Python Engine Considerations

The Python engine (`merq-engine` on port 5002) maintains:
- WebSocket connections to Angel One
- Active position tracking
- Order execution state

**Restarting Python engine WILL disconnect from broker.**

### Safe Python Updates:
```bash
# Only restart during non-market hours
pm2 restart merq-engine
```

For live updates without restart, implement a **hot-reload mechanism** or use separate dev/prod instances like backend.
