# 🚀 Aurelis Blockchain - Deployment Master Plan

This document outlines the step-by-step procedure to deploy the Aurelis Republic Blockchain Infrastructure (Node, Wallet, and Explorer) to a production environment.

## 📋 Prerequisites

Before proceeding, ensure the target environment has the following installed:
1.  **Git**: For cloning the repository.
2.  **Docker Engine**: v20.10.0 or higher.
3.  **Docker Compose**: v2.0.0 or higher.

---

## ☁️ Scenario A: Cloud Deployment (DigitalOcean / AWS / VPS)

### 1. Provision Server
*   Recommended Specs: **4GB RAM, 2 vCPUs** (Ubuntu 22.04 LTS).
*   Ensure the following Firewall ports are **OPEN**:
    *   `3000` (Wallet UI)
    *   `3001` (Explorer UI)
    *   `18883` (JSON-RPC)
    *   `18888` (P2P Network)

### 2. Clone Repository
SSH into your server and run:
```bash
git clone https://github.com/EmekaIwuagwu/aurelis-blockchain.git
cd aurelis-blockchain
```

### 3. Permissions Setup
Make the startup script executable:
```bash
chmod +x start_infra.sh
```

### 4. Deploy Infrastructure
We use Docker Compose to spin up the Node, Wallet, and Explorer simultaneously in detached mode.
```bash
./start_infra.sh
```
*Wait approximately 3-5 minutes for the initial build to complete.*

### 5. Verify Running Services
Check the status of the containers:
```bash
docker-compose ps
```
You should see 3 services (`node`, `wallet`, `explorer`) with status `Up`.

### 6. Access Application
*   **Wallet**: `http://<YOUR_SERVER_IP>:3000`
*   **Explorer**: `http://<YOUR_SERVER_IP>:3001`
*   **Node API**: `http://<YOUR_SERVER_IP>:18883`

---

## 💻 Scenario B: Local Development (Windows)

### 1. Requirements
*   Install **Docker Desktop for Windows**.
*   Ensure the Docker daemon is running.

### 2. Start Services
Double-click the `start_infra.bat` file in the root directory.
*   A terminal window will open showing the build process.
*   Once complete, access the apps via `localhost`.

### 3. Stop Services
To shut down the network:
```cmd
docker-compose down
```

---

## 🔧 Troubleshooting

**Issue: "Connection Refused" on RPC**
*   Ensure the `aurelis-node` container is fully running (`docker logs aurelis-node`).
*   Verify firewall rules allow traffic on port `18883`.

**Issue: Blockchain Data Not Persisting**
*   Data is stored in the `./chain_data` volume mapping. Ensure the directory has write permissions if running on Linux:
    ```bash
    chmod -R 777 chain_data
    ```
