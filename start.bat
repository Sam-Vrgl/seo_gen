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

:: Check for backend\.env
if exist "backend\.env" goto env_exists
echo.
echo =======================================
echo Backend .env file not found.
set "GEMINI_KEY="
set /p "GEMINI_KEY=Please enter your Gemini API Key: "
>"backend\.env" echo GEMINI_API_KEY=%GEMINI_KEY%
>>"backend\.env" echo LIST_TOKEN_USE=false
echo =======================================
:env_exists

echo.
echo Installing dependencies...
call bun install

echo.
echo Starting Backend...
start "SEO Gen - Backend" cmd /k "cd backend && bun run index.ts"

echo Starting Frontend...
start "SEO Gen - Frontend" cmd /k "cd frontend && bun run dev"

echo.
echo Waiting for services to initialize before opening browser...
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo =======================================
echo Services started!
echo Frontend and Backend are running in new windows.
echo Browser opened to: http://localhost:5173
echo =======================================
