#!/bin/bash

# Start Dashboard Script
# This script starts the API server with the browser dashboard

echo "🚀 Starting Solead Dashboard..."
echo "================================"
echo ""

# Check if Redis is running
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis is running"
    else
        echo "⚠️  Redis is not running. Starting Redis is recommended for production."
        echo "   To install Redis: brew install redis"
        echo "   To start Redis: redis-server"
        echo ""
        echo "   Continuing with mock queue system..."
    fi
else
    echo "⚠️  Redis is not installed."
    echo "   To install Redis: brew install redis"
    echo "   To start Redis: redis-server"
    echo ""
    echo "   Continuing with mock queue system..."
fi

echo ""
echo "📝 Starting API Server..."
echo "------------------------"

# Start the API server
npx ts-node src/api/server.ts &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Check if server started successfully
if ps -p $SERVER_PID > /dev/null; then
    echo "✅ API Server started (PID: $SERVER_PID)"
    echo ""
    echo "🌐 Dashboard Available At:"
    echo "   http://localhost:3001/dashboard"
    echo ""
    echo "📌 API Endpoints:"
    echo "   http://localhost:3001/api/health"
    echo "   http://localhost:3001/api/queues/stats"
    echo ""
    echo "Press Ctrl+C to stop the server"
    
    # Open dashboard in browser (macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sleep 2
        open "http://localhost:3001/dashboard"
    fi
    
    # Wait for server process
    wait $SERVER_PID
else
    echo "❌ Failed to start API server"
    echo "   Check the logs for errors"
    exit 1
fi