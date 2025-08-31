#!/bin/bash

# Simple Dashboard Start Script (Relaxed TypeScript checking for demo)

echo "🚀 Starting Solead Dashboard (Demo Mode)..."
echo "=========================================="
echo ""

# Start the API server with relaxed TypeScript
echo "📝 Starting API Server..."
echo "------------------------"

# Use the demo tsconfig with relaxed rules
TS_NODE_PROJECT=tsconfig.demo.json npx ts-node src/api/server.ts &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Check if server started
if ps -p $SERVER_PID > /dev/null; then
    echo "✅ API Server started (PID: $SERVER_PID)"
    echo ""
    echo "🌐 Dashboard Available At:"
    echo "   http://localhost:3001/dashboard"
    echo ""
    echo "📌 To test the dashboard:"
    echo "   1. Open the URL above in your browser"
    echo "   2. The dashboard will auto-refresh every 3 seconds"
    echo "   3. You can add jobs using the control panel"
    echo "   4. Note: Redis is not required for this demo"
    echo ""
    echo "Press Ctrl+C to stop the server"
    
    # Open dashboard in browser (macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo ""
        echo "🌐 Opening dashboard in your browser..."
        sleep 2
        open "http://localhost:3001/dashboard"
    fi
    
    # Wait for server process
    wait $SERVER_PID
else
    echo "❌ Failed to start API server"
    exit 1
fi