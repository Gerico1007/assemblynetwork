#!/bin/bash
# ♠️🌿🎸🧵 AssemblyNetwork Background Startup Script
# Runs the dashboard as a background service

echo "♠️🌿🎸🧵 AssemblyNetwork - Starting in Background Mode"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Change to script directory
cd "$(dirname "$0")"

# Check if already running
if [ -f .assemblynetwork.pid ]; then
    OLD_PID=$(cat .assemblynetwork.pid)
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo "⚠️  AssemblyNetwork is already running (PID: $OLD_PID)"
        echo ""
        echo "To stop it, run: ./stop.sh"
        exit 1
    else
        # Stale PID file, remove it
        rm .assemblynetwork.pid
    fi
fi

# Get local IP
LOCAL_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")

# Start in background
nohup npm start > assemblynetwork.log 2>&1 &
PID=$!

# Save PID
echo $PID > .assemblynetwork.pid

echo "✅ AssemblyNetwork started in background"
echo ""
echo "   PID: $PID"
echo "   Log: assemblynetwork.log"
echo ""
echo "📡 Dashboard available at:"
echo "   • http://localhost:9000"
if [ "$LOCAL_IP" != "localhost" ]; then
    echo "   • http://$LOCAL_IP:9000"
fi
echo ""
echo "Commands:"
echo "   View logs: tail -f assemblynetwork.log"
echo "   Stop server: ./stop.sh"
echo ""
