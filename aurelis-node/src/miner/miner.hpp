#pragma once

#include "chain/block.hpp"
#include <atomic>
#include <thread>
#include <functional>
#include <vector>
#include <mutex>

namespace aurelis {

class Mempool;

class Miner {
public:
    Miner(const Block& baseBlock, Mempool& mempool);
    ~Miner();

    void Start(int numThreads);
    void Stop();
    void UpdateWork(const Block& baseBlock);

    bool IsRunning() const { return running; }

    // Callback when block found
    void SetBlockFoundCallback(std::function<void(const Block&)> cb) { onBlockFound = cb; }

private:
    Block targetBlock;
    Mempool& mempool;
    int threadCount;
    std::atomic<int> workVersion;
    std::mutex workMutex;
    std::atomic<bool> running;
    std::vector<std::thread> workerThreads;
    std::function<void(const Block&)> onBlockFound;

    void MineWorker(int threadId);
};

} // namespace aurelis
