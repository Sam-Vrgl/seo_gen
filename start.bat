@echo off
echo =======================================
echo    Starting SEO Gen (Localhost)
echo =======================================

:: Check if bun is installed
where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Bun is not installed or not in your PATH. 
    echo Please follow the README.md instructions to install Bun.
    pause
    exit /b
)

echo.
echo Installing dependencies...
call bun install

echo.
echo Starting Backend...
start "SEO Gen - Backend" cmd /k "cd backend && bun run index.ts"

echo Starting Frontend...
start "SEO Gen - Frontend" cmd /k "cd frontend && bun run dev"

echo.
echo =======================================
echo Services started!
echo Frontend and Backend are running in new windows.
echo You can access the site at: http://localhost:5173
echo =======================================
