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
echo Starting services...
call bun run start.ts
pause
