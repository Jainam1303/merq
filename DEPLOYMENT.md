# Deployment Guide for Admin Panel

Since you have an **AWS (Backend)** and **Vercel (Frontend)** setup, follow these steps to deploy your new Admin Panel.

## 1. Push Changes to Git
First, ensure all the new code is committed and pushed to your repository (GitHub/GitLab).

```bash
git add .
git commit -m "Added Admin Panel features"
git push origin main
```

---

## 2. Frontend Deployment (Vercel)
Vercel is likely connected to your Git repository. It should **automatically detect the push** and start a new build.

**Action Items:**
1. Go to your Vercel Dashboard.
2. Check if a new deployment has started.
3. **Verify Environment Variables:** Ensure `NEXT_PUBLIC_API_URL` is set to your production AWS backend URL (e.g., `https://api.merqprime.in`).
4. Wait for the build to complete (green checkmark).

---

## 3. Backend Deployment (AWS EC2)
Your backend needs to be updated manually (unless you have a CI/CD pipeline).

**step 3.1: Connect to AWS**
SSH into your instance:
```bash
ssh -i "your-key.pem" ubuntu@your-ec2-ip
```

**Step 3.2: Update Code**
Navigate to your project folder and pull the latest changes:
```bash
cd MerQprime/backend-node
git pull origin main
```

**Step 3.3: Install Dependencies**
We added some new logic, although no new packages were strictly required, it's good practice:
```bash
npm install
```

**Step 3.4: ⚠️ Update Database Schema (Critical)**
We added new tables (AuditLogs, Payments, Announcements) and columns. You MUST run the sync script to update your production database without losing data.
```bash
node scripts/sync_db.js
```
*Output should say: "Database synced successfully."*

**Step 3.5: Create Your Admin Account**
Promote your existing user account to be an Admin:
```bash
node scripts/make_admin.js <your-username>
```
*Replace `<your-username>` with your actual username.*

**Step 3.6: Restart Backend**
Apply the changes by restarting the server process. If you use PM2:
```bash
pm2 restart all
# OR specific process
pm2 restart backend-node
```

---

## 4. Verification
1. Open your live website (e.g., `https://merqprime.in/admin`).
2. You should see the login check or the dashboard.
3. If it loads, **Success!**

## Troubleshooting
- **"Admin access denied"**: Ensure you ran `scripts/make_admin.js` on the *production* server, not just locally.
- **"Table not found"**: Ensure you ran `scripts/sync_db.js`.
- **Frontend errors**: Check Vercel logs.
