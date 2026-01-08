#!/bin/bash

# Aurelis Blockchain Infrastructure - Startup Script
# ---------------------------------------------------------------------------

echo "=================================================="
echo "   AURELIS REPUBLIC - BLOCKCHAIN INFRASTRUCTURE   "
echo "=================================================="

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed. Please install Docker to proceed."
    exit 1
fi

echo "[INFO] Building and starting services..."
echo "       1. Aurelis Node (Port 18883)"
echo "       2. Aurelis Wallet (Port 3000)"
echo "       3. Aurelis Explorer (Port 3001)"

# Build and start containers in detached mode
docker-compose up -d --build

echo ""
echo "=================================================="
echo "                DEPLOYMENT COMPLETE               "
echo "=================================================="
echo ""
echo "Access your services at:"
echo "   - Wallet:   http://localhost:3000"
echo "   - Explorer: http://localhost:3001"
echo "   - Node RPC: http://localhost:18883"
echo ""
echo "To view logs, run: docker-compose logs -f"
echo "To stop, run: docker-compose down"
