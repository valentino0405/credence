Write-Host "🚀 Setting up Advanced Stock Prediction System" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

Write-Host "📦 Installing Python dependencies..." -ForegroundColor Yellow
Set-Location backend
pip install -r requirements.txt
Write-Host "✅ Python dependencies installed!" -ForegroundColor Green

Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Yellow
Set-Location ..\frontend
npm install react-apexcharts apexcharts
Write-Host "✅ Frontend dependencies installed!" -ForegroundColor Green

Write-Host "🏃‍♂️ Starting the application..." -ForegroundColor Yellow

# Start backend in new window
Write-Host "Starting backend server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd ..\backend; python app.py"

# Start frontend in new window  
Write-Host "Starting frontend server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host "Backend: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Cyan

Write-Host "`nPress any key to exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")