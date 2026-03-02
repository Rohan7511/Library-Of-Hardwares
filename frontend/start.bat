@echo off
echo =============================================
echo   Library of Hardware - Starting Server...
echo =============================================
echo.
echo Opening in your browser at: http://localhost:3000
echo Press Ctrl+C to stop the server.
echo.
start http://localhost:3000
npx -y serve .
pause
