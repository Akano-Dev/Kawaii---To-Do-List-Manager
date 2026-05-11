@echo off
echo.
echo  ✨ Starting PixiDo Server...
echo  Open http://localhost:3000 in your browser
echo  Press Ctrl+C to stop
echo.
start http://localhost:3000
python -m http.server 3000
pause
