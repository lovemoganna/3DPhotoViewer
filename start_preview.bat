@echo off
title 3DPhotoViewer Launch Preview
cd /d "%~dp0"

echo ===================================================
echo     3D Photo Viewer - Preview Launcher
echo ===================================================
echo.

if not exist node_modules (
    echo [INFO] Installing node_modules, please wait...
    cmd /c "npm install"
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

echo.
echo [SUCCESS] Environment ready! Starting Vite preview server...
echo.

cmd /c "npm run dev"

if errorlevel 1 (
    echo [ERROR] Server exited with error.
)

pause
