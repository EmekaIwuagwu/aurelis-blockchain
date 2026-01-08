#!/bin/bash

# ============================================================================
# Aurelis Blockchain Infrastructure - Automated Deployment Script
# ============================================================================
# This script will:
#   1. Detect your Linux distribution
#   2. Install Docker and Docker Compose if not present
#   3. Build and launch the Node, Wallet, and Explorer
# ============================================================================

set -e  # Exit on any error

echo "================================================================"
echo "       AURELIS REPUBLIC - BLOCKCHAIN INFRASTRUCTURE             "
echo "================================================================"
echo ""

# -------------------------------------------------------------------------
# STEP 1: System Detection
# -------------------------------------------------------------------------
echo "[STEP 1/4] Detecting system..."

if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
    echo "✓ Detected: $NAME $VERSION"
else
    echo "❌ Unable to detect OS. This script supports Ubuntu/Debian."
    exit 1
fi

# -------------------------------------------------------------------------
# STEP 2: Install Docker (if needed)
# -------------------------------------------------------------------------
echo ""
echo "[STEP 2/4] Checking Docker installation..."

if ! command -v docker &> /dev/null; then
    echo "⚠ Docker not found. Installing Docker Engine..."
    
    if [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
        # Update package lists
        sudo apt-get update -qq
        
        # Install prerequisites
        sudo apt-get install -y -qq \
            ca-certificates \
            curl \
            gnupg \
            lsb-release
        
        # Add Docker's official GPG key
        sudo mkdir -p /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/$OS/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        
        # Set up Docker repository
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS \
          $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        # Install Docker Engine
        sudo apt-get update -qq
        sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        
        # Start Docker service
        sudo systemctl start docker
        sudo systemctl enable docker
        
        # Add current user to docker group (requires re-login to take effect)
        sudo usermod -aG docker $USER
        
        echo "✓ Docker installed successfully!"
        echo "  Note: You may need to log out and back in for group permissions to apply."
        
    else
        echo "❌ Unsupported OS for automatic Docker installation."
        echo "   Please manually install Docker: https://docs.docker.com/engine/install/"
        exit 1
    fi
else
    echo "✓ Docker is already installed ($(docker --version))"
fi

# -------------------------------------------------------------------------
# STEP 3: Install Docker Compose (if needed)
# -------------------------------------------------------------------------
echo ""
echo "[STEP 3/4] Checking Docker Compose installation..."

if ! command -v docker-compose &> /dev/null; then
    echo "⚠ Docker Compose not found. Installing..."
    
    # Install docker-compose standalone
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    echo "✓ Docker Compose installed successfully!"
else
    echo "✓ Docker Compose is already installed ($(docker-compose --version))"
fi

# -------------------------------------------------------------------------
# STEP 4: Deploy Aurelis Infrastructure
# -------------------------------------------------------------------------
echo ""
echo "[STEP 4/4] Deploying Aurelis services..."
echo "  → Aurelis Node (Port 18883)"
echo "  → Aurelis Wallet (Port 3000)"
echo "  → Aurelis Explorer (Port 3001)"
echo ""

# Build and start containers in detached mode
# Use 'sudo' if user is not in docker group yet
if groups $USER | grep -q '\bdocker\b'; then
    docker-compose up -d --build
else
    echo "  Using sudo (docker group not active yet)..."
    sudo docker-compose up -d --build
fi

echo ""
echo "================================================================"
echo "               ✓ DEPLOYMENT COMPLETE                            "
echo "================================================================"
echo ""
echo "Access your services:"
echo "  • Wallet:   http://$(hostname -I | awk '{print $1}'):3000"
echo "  • Explorer: http://$(hostname -I | awk '{print $1}'):3001"
echo "  • Node RPC: http://$(hostname -I | awk '{print $1}'):18883"
echo ""
echo "Local access:"
echo "  • Wallet:   http://localhost:3000"
echo "  • Explorer: http://localhost:3001"
echo "  • Node RPC: http://localhost:18883"
echo ""
echo "Useful commands:"
echo "  → View logs:  docker-compose logs -f"
echo "  → Stop:       docker-compose down"
echo "  → Restart:    docker-compose restart"
echo ""
echo "================================================================"
echo "       Built for the Republic of Aurelis • 2026                 "
echo "================================================================"
