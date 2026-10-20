@echo off
chcp 65001 >nul
title CRM de Prospeccao
cd /d "%~dp0crm"

rem 1) Scraper: o Docker Desktop precisa estar aberto (o scraper sobe junto com ele)
docker info >nul 2>&1
if errorlevel 1 (
  echo Abrindo o Docker Desktop...
  start "" "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe"
)

rem 2) Se o CRM ja estiver rodando, so abre o navegador
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing http://localhost:3000/api/health -TimeoutSec 3 | Out-Null; exit 0 } catch { exit 1 }"
if not errorlevel 1 (
  start "" http://localhost:3000
  exit /b
)

rem 3) Primeira vez: instala as dependencias
if not exist node_modules (
  echo Instalando dependencias, so na primeira vez...
  call npm install
)

rem 4) Prepara a versao mais recente e inicia
echo Preparando o CRM...
call npm run build
if errorlevel 1 (
  echo.
  echo Nao consegui preparar o CRM. Copie a mensagem acima e mande para o Claude.
  pause
  exit /b 1
)

echo.
echo CRM rodando em http://localhost:3000  ^(deixe esta janela aberta; feche para desligar^)
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep 4; Start-Process 'http://localhost:3000'"
call npm start
