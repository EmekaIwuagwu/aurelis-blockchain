#pragma once

#include <string>
#include <functional>
#include <thread>
#include <atomic>
#include <mutex>
#include "util/simplejson.hpp"

namespace aurelis {

class BlockChain;
class Mempool;

class RpcServer {
public:
    RpcServer(int port, BlockChain& chain, Mempool& mempool);
    ~RpcServer();

    void Start();
    void Stop();

private:
    int port;
    BlockChain& blockchain;
    Mempool& mempool;
    std::atomic<bool> running;
    std::thread serverThread;
    std::mutex mtx; // Protect blockchain and mempool access
    
    void RunLoop();
    std::string HandleRequest(const std::string& request);
    JsonValue Dispatch(const std::string& method, const std::vector<JsonValue>& params);
};

} // namespace aurelis
