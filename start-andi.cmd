@echo off
rem Andi page + Ollama proxy on port 8088, run in Docker (Windows Firewall blocks python.exe/node.exe inbound on this PC;
rem Docker's port publishing is allowed, same as Open WebUI on :3000). Container restarts with Docker Desktop.
cd /d "%~dp0"
docker rm -f andi-chat >nul 2>&1
docker run -d --name andi-chat --restart unless-stopped -p 8088:8088 -e ANDI_OLLAMA=http://host.docker.internal:11434 -v "%~dp0.:/app:ro" -w /app node:22-alpine node serve.js
echo Andi: http://127.0.0.1:8088   Tailscale: http://100.95.163.125:8088
