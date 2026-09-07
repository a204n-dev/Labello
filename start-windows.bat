@echo off
setlocal
cd /d "%~dp0"
title Labello Local WebUI

echo ==========================================================
echo   Labello - Vocal Labeling Workstation
echo   Starting Local Browser WebUI...
echo ==========================================================

REM Check if Python is installed
python --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Python detected. Starting local server...
    start "" http://localhost:8080
    if exist "dist\index.html" (
        cd dist
    )
    python -m http.server 8080
    goto end
)

py -3 --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Python Launcher detected. Starting local server...
    start "" http://localhost:8080
    if exist "dist\index.html" (
        cd dist
    )
    py -3 -m http.server 8080
    goto end
)

REM Fallback to native Windows PowerShell (zero installs required on any Windows PC)
echo [OK] Starting via Windows PowerShell built-in HTTP server...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher.ps1" -Port 8080

:end
pause
