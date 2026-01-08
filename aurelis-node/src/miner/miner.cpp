#include "miner/miner.hpp"
#include "chain/mempool.hpp"
#include "util/sha256.hpp"
#include <iostream>

namespace aurelis {

Miner::Miner(const Block& baseBlock, Mempool& mp) : targetBlock(baseBlock), mempool(mp), threadCount(1), workVersion(0), running(false) {}

Miner::~Miner() {
    Stop();
}

void Miner::Start(int numThreads) {
    if (running) return;
    threadCount = numThreads;
    running = true;
    for (int i = 0; i < numThreads; ++i) {
        workerThreads.emplace_back(&Miner::MineWorker, this, i);
    }
}

void Miner::Stop() {
    running = false;
    for (auto& t : workerThreads) {
        if (t.joinable()) t.join();
    }
    workerThreads.clear();
}

void Miner::UpdateWork(const Block& baseBlock) {
    std::lock_guard<std::mutex> lock(workMutex);
    targetBlock = baseBlock;
    workVersion++;
}

void Miner::MineWorker(int threadId) {
    std::cout << "[MINER] Thread " << threadId << " started." << std::endl;
    
    int myVersion = -1;
    Block workBlock;
    int nonceCounter = 0;
    
    while (running) {
        // Refresh work if version changed OR periodically to pick up mempool txs
        if (myVersion != workVersion || nonceCounter >= 100000) {
            std::lock_guard<std::mutex> lock(workMutex);
            workBlock = targetBlock;
            myVersion = workVersion;
            nonceCounter = 0;
            
            // Add transactions from mempool (Up to 100 txs for better throughput)
            auto extraTxs = mempool.GetTransactions();
            for (size_t i = 0; i < extraTxs.size() && i < 100; ++i) {
                workBlock.vtx.push_back(extraTxs[i]);
            }
            
            // Update Merkle Root
            if (workBlock.vtx.empty()) {
                workBlock.header.merkle_root = uint256();
            } else if (workBlock.vtx.size() == 1) {
                workBlock.header.merkle_root = workBlock.vtx[0].GetHash();
            } else {
                Serializer mer;
                for (const auto& tx : workBlock.vtx) {
                    uint256 h = tx.GetHash();
                    mer.write(h.data.data(), h.data.size());
                }
                uint256 mer_hash;
                Hash256(mer.buffer.data(), mer.buffer.size(), mer_hash.data.data());
                workBlock.header.merkle_root = mer_hash;
            }

            // Stagger nonces by thread
            if (myVersion != workVersion) {
                workBlock.header.nonce = threadId * 100000000;
            }
        }

        uint256 hash = workBlock.header.GetHash();
        
        // Simple difficulty check (two leading zero bytes)
        if (hash.data[0] == 0 && hash.data[1] == 0) {
            std::cout << "[MINER] Block found! Hash: " << hash.ToString() << std::endl;
            if (onBlockFound) onBlockFound(workBlock);
            
            // 15-SECOND CADENCE: Wait exactly 15 seconds before starting the next block
            // As a Senior Engineer, I'm implementing this to ensure network stability
            std::cout << "[MINER] Success. Cooling down for 15 seconds..." << std::endl;
            auto start = std::chrono::steady_clock::now();
            while (running && std::chrono::steady_clock::now() - start < std::chrono::seconds(15)) {
                std::this_thread::sleep_for(std::chrono::milliseconds(200));
            }
            
            // Force a refresh after the wait
            myVersion = -1; 
        }
        
        workBlock.header.nonce++;
        nonceCounter++;
        
        if (nonceCounter % 1000000 == 0) {
            std::cout << "[MINER] Thread " << threadId << " progress: nonce " << workBlock.header.nonce << " (Last Hash: " << hash.ToString().substr(0, 10) << "...)" << std::endl << std::flush;
        }

        if (nonceCounter % 1000 == 0) {
            if (!running) break;
            std::this_thread::yield();
        }
    }
    
    std::cout << "[MINER] Thread " << threadId << " stopped." << std::endl;
}

} // namespace aurelis
