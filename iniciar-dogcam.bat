@echo off
setlocal
title DogCam - Lanzador

REM ============================================================
REM  Dog Camera - arranque con doble clic
REM  Abre dos ventanas: Backend (3001) y Frontend (5173).
REM  Funciona desde cualquier carpeta donde este el proyecto.
REM ============================================================

set "ROOT=%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js no esta instalado o no esta en el PATH.
  echo Instalalo desde https://nodejs.org y vuelve a intentar.
  pause
  exit /b 1
)

if not exist "%ROOT%backend\package.json" (
  echo [ERROR] No se encontro la carpeta backend en: %ROOT%
  pause
  exit /b 1
)
if not exist "%ROOT%frontend\package.json" (
  echo [ERROR] No se encontro la carpeta frontend en: %ROOT%
  pause
  exit /b 1
)

echo Liberando puertos 5173 y 3001 (cierra instancias anteriores)...
for %%P in (5173 3001) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do (
    echo   - Cerrando proceso %%A que usaba el puerto %%P
    taskkill /F /PID %%A >nul 2>&1
  )
)

echo Iniciando backend...
start "DogCam - Backend (3001)" /D "%ROOT%backend" cmd /k "npm install && (if not exist .env copy .env.example .env) && npm run dev"

echo Iniciando frontend...
start "DogCam - Frontend (5173)" /D "%ROOT%frontend" cmd /k "npm install && npm run dev -- --strictPort"

echo.
echo Listo. En la ventana del Frontend busca la linea "Network:" para abrir la app en el telefono.
echo Abriendo https://localhost:5173 en el navegador en unos segundos...
timeout /t 12 /nobreak >nul
start "" "https://localhost:5173"

endlocal
exit /b 0
