@echo off
title Sitemap Generator
echo Starting sitemap generation...

:: Find Git Bash (try common paths)
set "bash_path="
if exist "C:\Program Files\Git\bin\bash.exe" set "bash_path=C:\Program Files\Git\bin\bash.exe"
if exist "C:\Program Files (x86)\Git\bin\bash.exe" set "bash_path=C:\Program Files (x86)\Git\bin\bash.exe"
if exist "%USERPROFILE%\AppData\Local\Programs\Git\bin\bash.exe" set "bash_path=%USERPROFILE%\AppData\Local\Programs\Git\bin\bash.exe"

:: If not found, try using where command (if git is in PATH)
if "%bash_path%"=="" (
    where bash >nul 2>&1
    if %errorlevel% equ 0 set "bash_path=bash"
)

if "%bash_path%"=="" (
    echo ERROR: Git Bash not found. Please install Git for Windows.
    pause
    exit /b 1
)

:: Run the sitemap script, then wait for Enter
"%bash_path%" -c "./generate-sitemap.sh; echo '✅ Sitemap created. Created By Er.Arun panthi. Press Enter to exit...'; read"

:: Fallback pause (just in case)
pause