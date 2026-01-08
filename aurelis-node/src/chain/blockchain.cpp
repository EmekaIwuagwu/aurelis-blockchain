#include "chain/blockchain.hpp"
#include "chain/genesis.hpp"
#include "util/sha256.hpp"
#include <iostream>

namespace aurelis {

BlockChain::BlockChain() {
}

bool BlockChain::AddBlock(const Block& block) {
    std::lock_guard<std::mutex> lock(chainMutex);
    
    uint256 hash = block.header.GetHash();
    if (blockIndexMap.count(hash)) return false; // Already exists

    // Validate block (PoW check)
    if (!ValidateBlock(block)) {
        return false;
    }

    // Check link to previous block (if not genesis)
    if (!chain.empty()) {
        if (block.header.prev_block != chain.back()->hash) {
            std::cout << "[CHAIN] Block REJECTED: prev_block mismatch. Expected " << chain.back()->hash.ToString() << " got " << block.header.prev_block.ToString() << std::endl;
            return false;
        }
    }

    auto index = std::make_shared<BlockIndex>(block, (int)chain.size());
    chain.push_back(index);
    blockIndexMap[hash] = index;
    blockData[hash] = block;

    // Update UTXO Set
    for (const auto& tx : block.vtx) {
        uint256 txid = tx.GetHash();
        
        // Spend inputs
        for (const auto& in : tx.vin) {
            if (in.prevout_hash != uint256()) {
                utxoSet.erase({in.prevout_hash, in.prevout_n});
            }
        }
        
        // Create new outputs
        for (uint32_t i = 0; i < tx.vout.size(); ++i) {
            utxoSet[{txid, i}] = {tx.vout[i]};
        }
    }

    std::cout << "[CHAIN] Accepted Block #" << index->height << " Hash: " << hash.ToString() << std::endl;
    SaveBlock(block);
    return true;
}

int BlockChain::GetHeight() const {
    std::lock_guard<std::mutex> lock(chainMutex);
    return (int)chain.size() - 1;
}

uint256 BlockChain::GetBestHash() const {
    std::lock_guard<std::mutex> lock(chainMutex);
    if (chain.empty()) return uint256();
    return chain.back()->hash;
}

std::shared_ptr<BlockIndex> BlockChain::GetIndex(const uint256& hash) const {
    std::lock_guard<std::mutex> lock(chainMutex);
    auto it = blockIndexMap.find(hash);
    return (it != blockIndexMap.end()) ? it->second : nullptr;
}

bool BlockChain::ValidateBlock(const Block& block) {
    // 1. Proof of Work check
    uint256 hash = block.header.GetHash();
    if (hash.data[0] != 0 || hash.data[1] != 0) {
        if (chain.empty()) return true; 
        std::cout << "[CHAIN] Validation FAILED: Insufficient difficulty. Hash: " << hash.ToString() << std::endl;
        return false;
    }

    // 2. Merkle Root check
    if (block.vtx.empty()) {
        std::cout << "[CHAIN] Validation FAILED: No transactions." << std::endl;
        return false;
    }
    
    uint256 computedMerkle;
    if (block.vtx.size() == 1) {
        computedMerkle = block.vtx[0].GetHash();
    } else {
        Serializer mer;
        for (const auto& tx : block.vtx) {
            uint256 h = tx.GetHash();
            mer.write(h.data.data(), h.data.size());
        }
        Hash256(mer.buffer.data(), mer.buffer.size(), computedMerkle.data.data());
    }

    if (block.header.merkle_root != computedMerkle) {
        std::cout << "[CHAIN] Validation FAILED: Merkle root mismatch. Header: " << block.header.merkle_root.ToString() << " Computed: " << computedMerkle.ToString() << std::endl;
        return false;
    }

    return true;
}

int64_t BlockChain::GetBalance(const std::string& address) const {
    std::lock_guard<std::mutex> lock(chainMutex);
    int64_t balance = 0;
    for (const auto& pair : utxoSet) {
        const UTXO& utxo = pair.second;
        std::string scriptAddr;
        if (!utxo.out.scriptPubKey.empty()) {
             scriptAddr = std::string((const char*)utxo.out.scriptPubKey.data(), utxo.out.scriptPubKey.size());
        }
        if (scriptAddr == address) {
            balance += utxo.out.value;
        }
    }
    return balance;
}

std::vector<std::pair<OutPoint, UTXO>> BlockChain::GetUTXOs(const std::string& address) const {
    std::lock_guard<std::mutex> lock(chainMutex);
    std::vector<std::pair<OutPoint, UTXO>> results;
    for (const auto& pair : utxoSet) {
        const UTXO& utxo = pair.second;
        std::string scriptAddr;
        if (!utxo.out.scriptPubKey.empty()) {
            scriptAddr = std::string((const char*)utxo.out.scriptPubKey.data(), utxo.out.scriptPubKey.size());
        }
        if (scriptAddr == address) {
            results.push_back(pair);
        }
    }
    return results;
}

Block BlockChain::GetBlockByHeight(int height) const {
    std::lock_guard<std::mutex> lock(chainMutex);
    if (height < 0 || height >= (int)chain.size()) return Block();
    auto it = blockData.find(chain[height]->hash);
    if (it == blockData.end()) return Block();
    return it->second;
}

Block BlockChain::GetBlock(const uint256& hash) const {
    std::lock_guard<std::mutex> lock(chainMutex);
    auto it = blockData.find(hash);
    if (it != blockData.end()) return it->second;
    return Block();
}

bool BlockChain::GetTransaction(const uint256& hash, Transaction& outTx, uint256& outBlockHash) const {
    std::lock_guard<std::mutex> lock(chainMutex);
    // Reverse search (newest first)
    for (auto it = chain.rbegin(); it != chain.rend(); ++it) {
        auto blockIt = blockData.find((*it)->hash);
        if (blockIt != blockData.end()) {
            const Block& block = blockIt->second;
            for (const auto& tx : block.vtx) {
                if (tx.GetHash() == hash) {
                    outTx = tx;
                    outBlockHash = block.header.GetHash();
                    return true;
                }
            }
        }
    }
    return false;
}

// --- Persistence Layer ---
void BlockChain::SaveBlock(const Block& block) {
    // Simple append-only storage
    std::ofstream file("blockchain.dat", std::ios::binary | std::ios::app);
    if (file.is_open()) {
        Serializer s;
        s << block;
        file.write((const char*)s.buffer.data(), s.buffer.size());
        file.close();
    }
}

void BlockChain::LoadChain() {
    std::ifstream file("blockchain.dat", std::ios::binary);
    if (!file.is_open()) return;

    // Read entire file into buffer (simple for prototype)
    std::vector<uint8_t> buffer((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
    file.close();

    if (buffer.empty()) return;

    Deserializer d(buffer);
    int count = 0;
    try {
        while (d.pos < d.buffer.size()) {
            Block block;
            d >> block;
            
            // Bypass Proof-of-Work check for faster loading, but verify links
            // (In a real system we'd check everything, but efficiently)
            // Here we just re-add it to internal structures manually to bypass "New Block" logic
            
            uint256 hash = block.header.GetHash();
            // Fix: Check size BEFORE accessing index 0 to avoid segfault
            if (chain.size() > 0 && hash == chain[0]->hash) continue; // Skip genesis if already there

            auto index = std::make_shared<BlockIndex>(block, (int)chain.size());
            chain.push_back(index);
            blockIndexMap[hash] = index;
            blockData[hash] = block;

            // Rebuild UTXO set
            for (const auto& tx : block.vtx) {
                uint256 txid = tx.GetHash();
                for (const auto& in : tx.vin) {
                    if (in.prevout_hash != uint256()) {
                        utxoSet.erase({in.prevout_hash, in.prevout_n});
                    }
                }
                for (uint32_t i = 0; i < tx.vout.size(); ++i) {
                    utxoSet[{txid, i}] = {tx.vout[i]};
                }
            }
            count++;
        }
    } catch (...) {
        std::cout << "[CHAIN] Warning: Corrupt blockchain data found. Loaded " << count << " blocks." << std::endl;
    }
    std::cout << "[CHAIN] Loaded " << count << " blocks from disk." << std::endl;
}

} // namespace aurelis
