# Phase 5: Deploy Frontend to Vercel

This is the final step to get your specialized Trading Dashboard online!

## ⚠️ Vital Concept (How we avoid errors)
Your backend (AWS) is on **HTTP**. Vercel (Frontend) is on **HTTPS**.
Normally, this causes a "Mixed Content" error.
**HOWEVER**, your project is configured with **Next.js Rewrites**.
This means Vercel's *Server* will talk to AWS (which is allowed), instead of your *Browser* talking to AWS directly.

To make this work, you must set the Environment Variables **EXACTLY** as shown below.

---

## Step 1: Initialize Vercel Project
1.  Go to [vercel.com/new](https://vercel.com/new).
2.  Connect your GitHub account.
3.  Find the **`merq`** repository and click **Import**.

## Step 2: Configure Project
1.  **Framework Preset**: Next.js (Default).
2.  **Root Directory**: Click `Edit` and select **`frontend`**.
    *   *Verification: It should say `frontend` next to the folder icon.*
3.  **Build Command**: Leave default (`next build`).
4.  **Install Command**: Leave default (`npm install` / `yarn install`).

## Step 3: Environment Variables (The Important Part)
Expand the **Environment Variables** section and add these:

| Name | Value | Description |
| :--- | :--- | :--- |
| `API_URL` | `http://3.110.30.136:5000` | **CRITICAL**. This tells Next.js where to proxy requests. |

*Note: Do NOT add `NEXT_PUBLIC_API_URL` pointing to HTTP. Your code is smart enough to use `/api` relative paths.*

## Step 4: Deploy
1.  Click **Deploy**.
2.  Wait for the build to finish (1-2 minutes).
3.  You will see "Congratulations!".
4.  Click the screenshot or "Continue to Dashboard" -> "Visit".

## Step 5: Final Verification
1.  Open your new Vercel App (e.g., `https://merq-frontend-xyz.vercel.app`).
2.  Try to **Login** or check the **System Status**.
3.  If the status shows "Active" (from your backend), YOU ARE DONE! 🚀

---

## Troubleshooting
-   **500/502 Error on Login**: Check the Vercel Logs. It might mean Vercel can't reach AWS (Firewall?).
    -   *Fix*: Ensure AWS Security Group allows Port 5000 from `0.0.0.0/0`. (We already did this).
-   **CORS Error**: Should not happen with Rewrites.
