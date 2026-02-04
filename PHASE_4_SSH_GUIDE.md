# Phase 4: Deploying to AWS EC2

**Server IP**: `3.110.30.136`
**User**: `ubuntu`
**Key File**: `merq-key.pem`

---

## Step 1: Connect to Server
1.  Open Command Prompt / PowerShell in the folder where you downloaded **merq-key.pem**.
    *(If you are unsure, type `ls` or `dir` to make sure you see the file).*
2.  Run the connection command:
    ```powershell
    ssh -i "merq-key.pem" ubuntu@3.110.30.136
    ```
3.  Type `yes` if asked to verify authenticity.

## Step 2: Install Software
Copy and paste this entire block into the server terminal:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install nodejs npm python3-pip python3-venv nginx postgresql-client -y
sudo npm install -g pm2
```

## Step 3: Download Your Code
```bash
git clone https://github.com/jainam1303/merq.git
cd merq/backend-node
npm install
```

## Step 4: Configure Backend
1.  Create the environment file:
    ```bash
    nano .env
    ```
2.  **Paste the following configuration** (Replace FRONTEND_URL with your Vercel URL):
    ```env
    # Database Configuration (AWS RDS)
    DATABASE_URL=postgresql://postgres:Jainam0911@merq-db.cr6wci82gjyg.ap-south-1.rds.amazonaws.com:5432/merq_prime
    
    # Server Configuration
    PORT=5000
    NODE_ENV=production
    
    # Security
    JWT_SECRET=merqprime_secure_jwt_secret_key_2026
    
    # Payment Gateway
    RAZORPAY_KEY_ID=rzp_test_RLpAtQfzRLttQC
    RAZORPAY_KEY_SECRET=ECEzLJN5dBr5vpe7XHfljyx0
    
    # Frontend URLs
    FRONTEND_URL=https://merq.vercel.app
    NEXT_PUBLIC_API_URL=http://3.110.30.136:5000
    ```
3.  Press **Ctrl+O**, **Enter**, **Ctrl+X**.

## Step 5: Start Node Server
```bash
# IMPORTANT: Start server.js, NOT app.js
pm2 start server.js --name "merq-backend"
```
*Note: Make sure Port 5000 is open in AWS Security Group!*

## Step 6: Configure Python Engine
```bash
cd ../engine-python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Step 7: Start Python Engine
We will use PM2 to keep Python running too!
```bash
pm2 start "gunicorn -w 1 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:5002" --name "merq-engine"
```

## Step 8: Save & Verify
```bash
pm2 save
pm2 list
pm2 logs
```

## Final Check
Open your browser and visit: `http://3.110.30.136:5000`
You should see: `{"message":"MerQPrime Node Backend Running","status":"active"}`
