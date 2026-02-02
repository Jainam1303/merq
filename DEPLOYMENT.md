# Deployment Guide: AWS (Backend) + Vercel (Frontend)

Hosting a trading system requires reliability and security. We will use **AWS** for the backend (Node.js + Python Engine + PostgreSQL) and **Vercel** for the frontend (React/Next.js).

**Budget**: Utilizing $100 AWS credits.
**Architecture**:
- **Frontend**: Vercel (HTTPS)
- **Backend**: AWS EC2 (Must be HTTPS to communicate with Vercel)
- **Database**: AWS RDS (PostgreSQL)

---

## Phase 1: Prepare Code (Local)

### Backend (Node.js)
1.  **CORS**: Update `backend-node/src/app.js` to allow the Vercel domain.
2.  **Process Management**: Use `pm2` instead of `gunicorn` (since it's Node.js).

### Engine (Python)
1.  **Dependencies**: Ensure `requirements.txt` has necessary packages.
2.  **Service**: Run as a systemd service or background process.

---

## Phase 2: Cloud Database (AWS RDS)
*Don't host DB on the app server.*

1.  **Log in to AWS Console**.
2.  **Go to RDS** -> **Create Database**.
    -   **Engine**: PostgreSQL.
    -   **Template**: Free Tier.
    -   **Identifier**: `merq-db`
    -   **Master Username**: `postgres`
    -   **Password**: *[SecurePassword]*
    -   **Public Access**: Yes (for initial setup/debugging, can lock down later).
    -   **Security Group**: Allow TCP Port 5432.
3.  **Copy Endpoint**: `merq-db.cr6wci82gjyg.ap-south-1.rds.amazonaws.com`

---

## Phase 3: Create Backend Server (AWS EC2)
1.  **Go to EC2** -> **Launch Instance**.
    -   **Name**: `MerQ-Backend`
    -   **OS**: Ubuntu 22.04 LTS
    -   **Instance Type**: `t3.micro` (or `t2.micro` eligible for free tier).
    -   **Key Pair**: Create/Download `.pem` file.
2.  **Security Group** (Firewall):
    -   Allow **SSH** (Port 22)
    -   Allow **HTTP** (Port 80)
    -   Allow **HTTPS** (Port 443)
    -   Allow **Custom TCP** (Port 5000/5001 - whichever port your Node app uses).
3.  **Launch Instance**.

---

## Phase 4: Deploy Backend (Node.js + Python)

1.  **Connect via SSH**:
    ```bash
    ssh -i "your-key.pem" ubuntu@<PUBLIC_IP>
    ```

2.  **Update & Install Tools**:
    ```bash
    sudo apt update && sudo apt upgrade -y
    sudo apt install nodejs npm python3-pip python3-venv nginx postgresql-client -y
    sudo npm install -g pm2
    ```

3.  **Clone Capability**:
    ```bash
    git clone https://github.com/jainam1303/merq.git
    cd merq
    ```

4.  **Setup Node Backend**:
    ```bash
    cd backend-node
    npm install
    # Create .env
    nano .env
    # Paste:
    # PORT=5000
    # DATABASE_URL=postgresql://postgres:<PASSWORD>@<RDS_ENDPOINT>:5432/postgres
    # ... other keys
    
    # Start with PM2
    pm2 start src/app.js --name "merq-backend"
    ```

5.  **Setup Python Engine**:
    ```bash
    cd ../engine-python
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    
    # Create systemd service for the engine
    sudo nano /etc/systemd/system/merq-engine.service
    ```
    *Add content ensuring it runs your engine loop.*

---

## Phase 5: Hosting Frontend (Vercel)
1.  **Go to Vercel.com** -> Connect GitHub.
2.  **Import Repo**: `merq`.
3.  **Root Directory**: `frontend`.
4.  **Env Variables**:
    -   `NEXT_PUBLIC_API_URL`: `http://<AWS_EC2_IP>:5000` (Initially)
5.  **Deploy**.

---

## Phase 6: SSL (HTTPS) - CRITICAL
*Required for Vercel <-> EC2 communication.*

1.  **Domain**: Buy a domain (e.g., from Namecheap or Route53).
2.  **DNS**: Point `A Record` to your EC2 Public IP.
3.  **Nginx Reverse Proxy**:
    -   Configure Nginx to listen on Port 80/443 and proxy to `localhost:5000`.
4.  **Certbot**:
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d yourdomain.com
    ```
5.  **Update Vercel**: Change `NEXT_PUBLIC_API_URL` to `https://yourdomain.com`.
