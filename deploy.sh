#!/bin/bash
set -e

echo "1. Installing Node.js, Python, and Git..."
sudo apt update
sudo apt install -y curl git python3 python3-pip python3-venv
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "2. Cloning repository..."
if [ -d "merq" ]; then
    echo "Repository already exists, pulling latest..."
    cd merq
    git pull
else
    git clone https://github.com/Jainam1303/merq.git
    cd merq
fi

echo "3. Setting up Backend..."
cd backend-node
npm install
sudo npm install -g pm2

echo "Creating .env file..."
cat << 'EOF' > .env
PORT=3002
DATABASE_URL="postgresql://neondb_owner:npg_7dhu0NjUVXGQ@ep-delicate-term-aoa3k7rx.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
EOF

echo "Starting Node.js Backend..."
pm2 delete merq-backend || true
pm2 start server.js --name "merq-backend"

echo "4. Setting up Python Engine..."
cd ../engine-python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pm2 delete merq-engine || true
pm2 start main.py --name "merq-engine" --interpreter python3

echo "5. Saving PM2..."
pm2 save

echo "DEPLOYMENT COMPLETE!"
