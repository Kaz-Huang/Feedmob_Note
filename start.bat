@echo off
title Feedmob WorkLog Launcher
cd /d "%~dp0"
if exist "feedmob_note\" cd /d "%~dp0feedmob_note"

cls
echo ===================================================
echo   Feedmob WorkLog System Launcher
echo   Checking environment and starting dev server...
echo ===================================================
echo.

if not exist "node_modules\" (
    echo [1/3] Installing dependencies, please wait...
    call npm install
) else (
    echo [1/3] Dependencies OK.
)

if not exist "prisma\dev.db" (
    echo [2/3] Initializing SQLite database...
    call npx prisma db push
    call node prisma/seed.js
) else (
    echo [2/3] Database OK.
)

echo [3/3] Starting Next.js server...
echo.
echo ===================================================
echo   Server is starting!
echo   Opening browser at: http://localhost:3000
echo   Press Ctrl + C to stop the server anytime.
echo ===================================================
echo.

start "" powershell -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:3000'"

call npm run dev

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Server exited with error code: %ERRORLEVEL%
    pause
)
