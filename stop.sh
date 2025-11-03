#!/bin/bash
# ♠️🌿🎸🧵 AssemblyNetwork Stop Script
# Stops the background dashboard service

echo "♠️🌿🎸🧵 AssemblyNetwork - Stopping Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Change to script directory
cd "$(dirname "$0")"

# Check if PID file exists
if [ ! -f .assemblynetwork.pid ]; then
    echo "⚠️  No PID file found"
    echo "AssemblyNetwork may not be running in background mode"
    echo ""
    echo "Checking for any running instances..."
    PIDS=$(pgrep -f "node server.js")
    if [ -n "$PIDS" ]; then
        echo "Found running instances:"
        ps -p $PIDS -o pid,cmd
        echo ""
        read -p "Kill these processes? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill $PIDS
            echo "✅ Stopped all instances"
        fi
    else
        echo "No running instances found"
    fi
    exit 0
fi

# Read PID
PID=$(cat .assemblynetwork.pid)

# Check if process is running
if ! ps -p $PID > /dev/null 2>&1; then
    echo "⚠️  Process $PID is not running"
    rm .assemblynetwork.pid
    exit 0
fi

# Stop the process
echo "Stopping AssemblyNetwork (PID: $PID)..."
kill $PID

# Wait for process to stop
sleep 2

# Check if stopped
if ps -p $PID > /dev/null 2>&1; then
    echo "⚠️  Process didn't stop gracefully, forcing..."
    kill -9 $PID
    sleep 1
fi

# Remove PID file
rm .assemblynetwork.pid

echo "✅ AssemblyNetwork stopped"
echo ""
