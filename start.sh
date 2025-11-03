#!/bin/bash
# ♠️🌿🎸🧵 AssemblyNetwork Startup Script
# Network Discovery Dashboard Launcher

echo "♠️🌿🎸🧵 AssemblyNetwork - Network Discovery Dashboard"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Change to script directory
cd "$(dirname "$0")"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please install Node.js >= 14.0.0"
    exit 1
fi

# Check if nmap is installed
if ! command -v nmap &> /dev/null; then
    echo "⚠️  Warning: nmap is not installed"
    echo "Network scanning will not work without nmap"
    echo ""
    echo "Install with:"
    echo "  Ubuntu/Debian: sudo apt-get install nmap"
    echo "  Termux: pkg install nmap"
    echo "  macOS: brew install nmap"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found"
    echo "Using .env.example as template"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env from .env.example"
        echo "Please edit .env with your Upstash Redis credentials"
        echo ""
    fi
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
    echo ""
fi

# Get local IP address
LOCAL_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")

echo "🚀 Starting AssemblyNetwork Dashboard..."
echo ""
echo "📡 Dashboard will be available at:"
echo "   • http://localhost:9000"
if [ "$LOCAL_IP" != "localhost" ]; then
    echo "   • http://$LOCAL_IP:9000 (network access)"
fi
echo ""
echo "Press Ctrl+C to stop the server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start the server
npm start
