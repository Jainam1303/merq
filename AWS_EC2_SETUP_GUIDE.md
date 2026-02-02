# AWS EC2 (Backend Server) Setup Guide - Step-by-Step

This guide walks you through launching the virtual server (EC2) that will run your Node.js backend and Python trading engine.

## Step 1: Navigate to EC2
1. In the AWS Console search bar, type **EC2**.
2. Click **EC2**.
3. Click the orange **Launch instance** button.

## Step 2: Name and OS
1. **Name**: `MerQ-Backend`
2. **Application and OS Images (AMI)**:
   - Select **Ubuntu**.
   - Ensure the dropdown says **Ubuntu Server 22.04 LTS (HVM)**.
   - It should say *"Free tier eligible"*.

## Step 3: Instance Type
1. **Instance type**: `t2.micro` or `t3.micro`.
   - Look for the **"Free tier eligible"** tag next to the name. This is crucial for keeping it free.

## Step 4: Key Pair (Login Key)
1. **Key pair name**: Click **Create new key pair**.
2. **Key pair name**: `merq-key`.
3. **Key pair type**: `RSA`.
4. **Private key file format**: `.pem`.
5. Click **Create key pair**.
   - **CRITICAL**: A file named `merq-key.pem` will verify download. **Save this file safely!** You cannot download it again. If you lose it, you lose access to the server.

## Step 5: Network Settings (Firewall)
1. Click **Edit** (top right of this section) or check the boxes.
2. **Auto-assign public IP**: Enable.
3. **Firewall (security groups)**: Select **Create security group**.
4. **Security group name**: `merq-backend-sg`.
5. **Inbound Security Group Rules**:
   - Rule 1 (Default): **ssh** | **TCP** | **22** | **Anywhere (0.0.0.0/0)**
   - Rule 2 (Click Add security group rule): **HTTP** | **TCP** | **80** | **Anywhere**
   - Rule 3 (Add rule): **HTTPS** | **TCP** | **443** | **Anywhere**
   - Rule 4 (Add rule): **Custom TCP** | **TCP** | **5000** | **Anywhere**
     - *This is for your Node.js API.*

## Step 6: Configure Storage
1. The default is usually **8 GiB gp2/gp3**. 
2. You can increase this to **20 GiB** if you want (Free tier allows up to 30 GiB total across all instances). 20 GiB is plenty.

## Step 7: Launch
1. Summary panel on the right: Check "Free tier" text.
2. Click **Launch instance**.
3. Value: **Success**. Click the **Instance ID** (e.g., `i-012345...`) to view your server.

---

## Step 8: Get Connection Info
Wait until **Instance state** is **Running** and **Status check** is **2/2 passed** (ok if status check takes a while).

1. Click on your instance to select it.
2. Find the **Public IPv4 address** in the details pane (e.g., `13.235.xx.xx`).
3. **Copy this IP address**.

---

## Next Steps
Once you have the **Public IP** and your **merq-key.pem** file, we are ready to connect and install the code!
