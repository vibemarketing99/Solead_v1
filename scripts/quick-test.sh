#!/bin/bash

# Solead Quick Test Script
# Run this for immediate human validation of the system

echo "🚀 SOLEAD QUICK TEST SCRIPT"
echo "═══════════════════════════════════════"
echo ""

# Check environment
echo "🔍 Step 1: Environment Check"
if [ -f ".env" ]; then
    echo "✅ .env file found"
    if grep -q "BROWSERBASE_API_KEY=bb_live_" .env && grep -q "OPENAI_API_KEY=sk-proj-" .env; then
        echo "✅ API keys configured"
    else
        echo "❌ API keys missing or incomplete"
        echo "   Please check .env file has BROWSERBASE_API_KEY and OPENAI_API_KEY"
        exit 1
    fi
else
    echo "❌ .env file not found"
    echo "   Please ensure you're in the solead directory"
    exit 1
fi

# Check Node.js and dependencies
echo ""
echo "🔧 Step 2: Dependencies Check"
if command -v node &> /dev/null; then
    echo "✅ Node.js found: $(node --version)"
else
    echo "❌ Node.js not found - please install Node.js 18+"
    exit 1
fi

if [ -d "node_modules" ]; then
    echo "✅ Dependencies installed"
else
    echo "📦 Installing dependencies..."
    npm install
fi

# Run the simple live test
echo ""
echo "🧪 Step 3: Live System Test"
echo "Starting browser automation test..."
echo "⏳ This will take 30-60 seconds..."
echo ""

# Run the test and capture output
npx tsx demos/simple-live-test.ts

# Check if test completed successfully
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS! System is working!"
    echo ""
    echo "📊 What this proves:"
    echo "   ✅ Browser automation working"
    echo "   ✅ Threads platform accessible"
    echo "   ✅ AI content extraction functional"
    echo "   ✅ Lead scoring algorithm validated"
    echo ""
    echo "🚀 NEXT STEPS:"
    echo "   1. Review extracted leads above for quality"
    echo "   2. Note the lead scores (87% = hot, 33% = medium)"
    echo "   3. Check the BrowserBase session URL to see automation"
    echo "   4. Ready for authentication implementation!"
    echo ""
    echo "📖 For detailed next steps: docs/NEXT_STEPS_AND_TESTING_GUIDE.md"
else
    echo ""
    echo "❌ Test failed - please check errors above"
    echo ""
    echo "🔧 Common solutions:"
    echo "   • Check internet connection"
    echo "   • Verify API keys in .env file"
    echo "   • Try running: npm install"
    echo "   • Check BrowserBase account status"
fi

echo ""
echo "═══════════════════════════════════════"
echo "Test completed: $(date)"