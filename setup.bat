#!/bin/bash

echo "Setting up Advanced Stock Prediction System"
echo "============================================="

echo "Installing Python dependencies..."
cd backend
pip install -r requirements.txt
echo "Python dependencies installed!"

echo "Installing Node.js dependencies..."
cd ../frontend
npm install react-apexcharts apexcharts
echo "Frontend dependencies installed!"

echo "Starting the application..."
echo "Starting backend server..."
cd ../backend
start python app.py

echo "Starting frontend server..."
cd ../frontend
start npm run dev

echo "Setup complete!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:8000/docs"