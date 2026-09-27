@echo off
cd /d "%~dp0"
echo TRON :: DISC ARENA  -^>  http://localhost:8080
python -m http.server 8080
pause
