# AWS RDS (PostgreSQL) Setup Guide - Step-by-Step

This guide provides a detailed, click-by-click walkthrough for creating your cloud database on AWS within the Free Tier limits.

## Prerequisites
- You have an AWS Account.
- You have logged into the [AWS Management Console](https://console.aws.amazon.com/).

---

## Step 1: Navigate to RDS
1. In the top search bar of the AWS Console, type **RDS**.
2. Click on **RDS (Managed Relational Database Service)**.
3. In the sidebar, click **Databases**.
4. Click the orange **Create database** button.

## Step 2: Choose Creation Method
1. Select **Standard create** (This gives us control over costs/settings).
2. **Engine options**: Select **PostgreSQL**.
3. **Engine Version**: Select the default offered (likely PostgreSQL 16.x or 15.x).
4. **Templates**: Select **Free tier**.
   - *Critical: If you don't select Free tier, you might deploy a costly server.*

## Step 3: Settings
1. **DB instance identifier**: `merq-db`
   - *This is the name of the server in your dashboard.*
2. **Master username**: `postgres`
   - *Keep this default.*
3. **Credentials Management**: Select **Self managed**.
4. **Master password**:
   - Create a strong password (e.g., `Jainam0911').
   - **WRITE THIS DOWN**. You cannot recover it easily if lost.

## Step 4: Instance Configuration
1. **DB instance class**: Ensure `db.t3.micro` (or `db.t4g.micro`) is selected.
   - Look for the text saying *"Free tier eligible"*.

## Step 5: Storage
1. **Storage type**: `gp2` (General Purpose SSD) or `gp3`.
2. **Allocated storage**: `20` GiB.
   - *This is the minimum for the Free Tier.*
3. **Storage autoscaling**: Uncheck "Enable storage autoscaling" to prevent unexpected costs if a bug fills your drive.

## Step 6: Connectivity (Important!)
1. **Compute resource**: Select "Don't connect to an EC2 compute resource".
2. **Virtual private cloud (VPC)**: Default VPC.
3. **Public access**: Select **Yes**.
   - *Why? This allows us to connect from your local computer and Vercel initially. We can restrict this later.*
4. **VPC security group**: Select **Create new**.
   - **New VPC security group name**: `merq-db-sg`.
5. **Availability Zone**: No preference.

## Step 7: Database Authentication
1. Select **Password authentication**.

## Step 8: Additional Configuration (Crucial Step!)
**Expand the "Additional configuration" arrow.**

1. **Initial database name**: Type `merq_prime`
   - *IMPORTANT: If you leave this blank, AWS builds the server but DOES NOT create the database inside it. You would have to connect manually to create it. Naming it here does it for you.*
2. **Backup**: Uncheck "Enable automatic backups" if you want to save strictly on storage, but keeping it on (set to 7 days) is usually free within limits.
3. **Encryption**: Leave defaults.
4. **Maintenance**: uncheck "Enable Minor Version Upgrade" if you want stability.

## Step 9: Create and Wait
1. Scroll to the bottom. You should see "Estimated monthly costs". 
   - It should say roughly "12 months free..." or a low amount if your free tier is expired.
2. Click **Create database**.
3. You will be taken back to the list. The status will say **Creating**.
   - This takes **5 to 10 minutes**. Go grab a coffee. ☕

---

## Step 10: Get Connection Details
Once the status changes to **Available**:

1. Click on the database name (`merq-db`).
2. Implement **Connectivity & security** tab.
3. Copy the **Endpoint** (It looks like: `merq-db.cw5xyz.us-east-1.rds.amazonaws.com`).
4. Note the **Port** (Default: `5432`).

## Step 11: Final Security Check
1. Click on the link under **VPC security groups** (e.g., `merq-db-sg`).
2. Click the **Inbound rules** tab.
3. Click **Edit inbound rules**.
4. Ensure there is a rule:
   - **Type**: PostgreSQL (TCP)
   - **Port range**: 5432
   - **Source**: `0.0.0.0/0` (Allow from Anywhere)
   - *Note: "Anywhere" is okay for setup, but later we will change this to only allow your EC2 instance IP.*
5. Save rules.

### Use these details for your `.env` file:
```env
DATABASE_URL=postgresql://postgres:YourMasterPassword@merq-db.cw5xyz...amazonaws.com:5432/merq_prime
```
