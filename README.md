# 🏛️ Aurelis Republic Blockchain

> The sovereign digital ledger of the Aurelis Republic.

Aurelis is a custom-built, high-performance blockchain implementation featuring a C++ core node, a React/TypeScript Wallet, and a live Block Explorer.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)
![Protocol](https://img.shields.io/badge/protocol-v0.1.0-gold.svg)

## 🏗️ Architecture

The ecosystem consists of three main components containerized with Docker:

1.  **Aurelis Node (`/aurelis-node`)**:
    *   **Language**: C++ 17
    *   **Role**: Layer 1 Ledger, Proof-of-Work Miner, P2P Networking, JSON-RPC Server.
    *   **Port**: `18883` (RPC), `18888` (P2P).

2.  **Aurelis Wallet (`/aurelis-wallet`)**:
    *   **Language**: TypeScript, React (Vite).
    *   **Role**: Non-custodial key management, transaction signing, asset transfer UI.
    *   **Port**: `3000`.

3.  **Aurelis Explorer (`/aurelis-explorer`)**:
    *   **Language**: TypeScript, React (Vite).
    *   **Role**: Real-time blockchain visualization, block/txn inspection, network telemetry.
    *   **Port**: `3001`.

## 🚀 Quick Start (Docker)

The easiest way to run the entire stack is using the provided automation scripts.

### Linux / macOS / Cloud
```bash
# 1. Clone repo
git clone https://github.com/EmekaIwuagwu/aurelis-blockchain.git
cd aurelis-blockchain

# 2. Run deployment script
chmod +x start_infra.sh
./start_infra.sh
```

### Windows
1.  Ensure Docker Desktop is running.
2.  Double-click `start_infra.bat`.

## 📍 Access Points

| Service  | Local URL | Description |
| :--- | :--- | :--- |
| **Wallet** | [http://localhost:3000](http://localhost:3000) | Manage funds & keys |
| **Explorer** | [http://localhost:3001](http://localhost:3001) | View chain history |
| **Node RPC** | [http://localhost:18883](http://localhost:18883) | JSON-RPC Endpoint |

## 📚 Documentation
*   [Deployment Plan](./DEPLOYMENT_PLAN.md): Detailed cloud provisioning guide.
*   [API Documentation](./aurelis-node/README.md): RPC methods reference.

---
*Built for the Republic of Aurelis. 2026.*
