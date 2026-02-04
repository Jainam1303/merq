# Setting Up api.merqprime.in for Backend Communication

This guide will help you set up a professional subdomain (`api.merqprime.in`) for your backend API.

---

## Phase 1: DNS Configuration (Domain Registrar)

**Where:** Your domain registrar (where you bought `merqprime.in`)

1. Log in to your domain registrar (GoDaddy, Namecheap, etc.)
2. Go to DNS Management for `merqprime.in`
3. Add a new **A Record**:
   - **Type**: A
   - **Name/Host**: `api`
   - **Value/Points to**: `3.110.30.136` (your AWS IP)
   - **TTL**: 3600 (or default)
4. Save changes
5. **Wait 5-15 minutes** for DNS propagation

**Verify DNS:** Open terminal and run:
```bash
nslookup api.merqprime.in
```
You should see `3.110.30.136` in the response.

---

## Phase 2: AWS Backend Setup (SSH into EC2)

### Step 1: Install Nginx
```bash
ssh -i "merq-key.pem" ubuntu@3.110.30.136

# Update system
sudo apt update

# Install Nginx
sudo apt install nginx -y

# Check if Nginx is running
sudo systemctl status nginx
```

### Step 2: Install SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate for api.merqprime.in
sudo certbot --nginx -d api.merqprime.in

# Follow prompts:
# - Enter your email
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (option 2)
```

### Step 3: Configure Nginx for API Subdomain
```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/api.merqprime.in
```

**Paste this configuration:**
```nginx
server {
    server_name api.merqprime.in;

    # Backend API
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO support
    location /socket.io/ {
        proxy_pass http://localhost:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/api.merqprime.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.merqprime.in/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = api.merqprime.in) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    server_name api.merqprime.in;
    return 404;
}
```

**Save and exit** (Ctrl+O, Enter, Ctrl+X)

### Step 4: Enable the Configuration
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/api.merqprime.in /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

### Step 5: Update Backend CORS Settings
```bash
cd ~/merq/backend-node
nano .env
```

**Update these lines:**
```env
# Add both domains (comma-separated or update app.js to handle array)
FRONTEND_URL=https://merq.vercel.app,https://merqprime.in
```

**Save and exit**

Now edit `src/app.js` to support multiple origins:
```bash
nano src/app.js
```

**Find this section (around line 13-18):**
```javascript
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL,
    process.env.NEXT_PUBLIC_API_URL
].filter(Boolean);
```

**Replace with:**
```javascript
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://merq.vercel.app',
    'https://merqprime.in',
    'https://www.merqprime.in',
    process.env.NEXT_PUBLIC_API_URL
].filter(Boolean);
```

**Save and exit** (Ctrl+O, Enter, Ctrl+X)

### Step 6: Restart Backend
```bash
pm2 restart merq-backend
pm2 save
```

### Step 7: Test Backend API
Open browser and visit:
```
https://api.merqprime.in
```
You should see: `{"message":"MerQPrime Node Backend Running","status":"active"}`

---

## Phase 3: Frontend Changes (Local Development)

### Step 1: Update next.config.js
```bash
# On your local machine
cd d:/Jainam/MerQ/MerQPrime/frontend
```

Edit `next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        // Use environment variable for flexibility
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.merqprime.in';
        console.log(`[Next.js] Rewriting API calls to: ${apiUrl}`);
        return [
            {
                source: '/api/:path*',
                destination: `${apiUrl}/:path*`,
            },
            {
                source: '/socket.io',
                destination: `${apiUrl}/socket.io/`,
            },
            {
                source: '/socket.io/:path*',
                destination: `${apiUrl}/socket.io/:path*`,
            },
        ];
    },
    async headers() {
        return [
            {
                source: '/api/:path*',
                headers: [
                    { key: 'Access-Control-Allow-Credentials', value: 'true' },
                    { key: 'Access-Control-Allow-Origin', value: '*' },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
```

### Step 2: Commit and Push Changes
```bash
git add .
git commit -m "feat: Update API endpoint to use api.merqprime.in subdomain"
git push origin master
```

---

## Phase 4: Vercel Configuration

### Step 1: Add Environment Variable
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`merq`)
3. Go to **Settings** > **Environment Variables**
4. Add new variable:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://api.merqprime.in`
   - **Environment**: Production, Preview, Development (select all)
5. Click **Save**

### Step 2: Redeploy
1. Go to **Deployments** tab
2. Click the three dots on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete (~2 minutes)

---

## Phase 5: Verification & Testing

### Test 1: DNS Resolution
```bash
nslookup api.merqprime.in
# Should return: 3.110.30.136
```

### Test 2: SSL Certificate
Open browser: `https://api.merqprime.in`
- Should show green padlock (secure)
- Should show backend status message

### Test 3: Frontend Connection
1. Visit `https://merqprime.in` (or `merq.vercel.app`)
2. Open browser DevTools (F12) > Network tab
3. Try to login or interact with the app
4. Check network requests - they should go to `api.merqprime.in`
5. Verify no CORS errors in Console

### Test 4: WebSocket Connection
1. Go to Live Trading section
2. Check if real-time updates work
3. Verify Socket.IO connection in Network tab (should show `wss://api.merqprime.in/socket.io/`)

---

## Troubleshooting

### Issue: DNS not resolving
**Solution:** Wait longer (up to 24 hours in rare cases). Use `dig api.merqprime.in` to check.

### Issue: SSL certificate error
**Solution:**
```bash
sudo certbot renew --dry-run
sudo systemctl reload nginx
```

### Issue: 502 Bad Gateway
**Solution:** Check if backend is running:
```bash
pm2 list
pm2 logs merq-backend
```

### Issue: CORS errors
**Solution:** Verify `app.js` has correct origins and restart:
```bash
pm2 restart merq-backend
```

### Issue: Port 80/443 blocked
**Solution:** Open ports in AWS Security Group:
- Go to EC2 > Security Groups
- Add Inbound Rules: HTTP (80), HTTPS (443)

---

## Rollback Plan (If Something Goes Wrong)

If you need to revert to the old setup:

1. **Vercel:** Change `NEXT_PUBLIC_API_URL` back to `http://3.110.30.136:5000`
2. **Redeploy** Vercel
3. Your old setup will work immediately

The new `api.merqprime.in` setup doesn't interfere with direct IP access, so both can coexist.

---

## Summary

✅ **DNS**: `api.merqprime.in` → `3.110.30.136`  
✅ **Nginx**: Listens on 80/443, proxies to Node.js (5000)  
✅ **SSL**: Free Let's Encrypt certificate  
✅ **Backend**: Updated CORS to allow both domains  
✅ **Frontend**: Points to `https://api.merqprime.in`  
✅ **Vercel**: Environment variable configured  

**Estimated Time:** 30-45 minutes (excluding DNS propagation wait time)
