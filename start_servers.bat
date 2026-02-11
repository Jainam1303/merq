@echo off
echo ===================================================
echo      MerQPrime Server Manager - Restarting All
echo ===================================================

echo [1/4] Stopping any running node/python processes...
:: Use >nul 2>&1 to hide "process not found" errors
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
:: Close previous terminal windows by their titles
taskkill /F /FI "WINDOWTITLE eq Algo Engine (5002)*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Backend API (3002)*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Frontend (3000)*" >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/4] Starting Python Algo Engine (Port 5002)...
cd engine-python
:: Check if venv exists, if so activate it (optional, assuming system python for now based on history)
start "MerQ Algo Engine" cmd /k "color 0E && title Algo Engine (5002) && python main.py"
cd ..

echo [3/4] Starting Node.js Backend (Port 3002)...
cd backend-node
start "MerQ Backend API" cmd /k "color 0B && title Backend API (3002) && npm start"
cd ..

echo [4/4] Starting Next.js Frontend (Port 3000)...
cd frontend
start "MerQ Frontend" cmd /k "color 0A && title Frontend (3000) && npm run dev"
cd ..

echo ===================================================
echo      All servers have been sent start commands.
echo      Please wait for the windows to initialize.
echo ===================================================
pause
