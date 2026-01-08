#pragma once

#include <string>
#include <vector>
#include <thread>
#include <atomic>
#include <mutex>
#include <map>
#include <functional>

#ifdef _WIN32
#include <winsock2.h>
#else
#include <sys/socket.h>
#include <netinet/in.h>
#endif

namespace aurelis {

struct Peer {
    std::string ip;
    int port;
    uint64_t socket;
    bool versionReceived;
    bool verackSent;
    int64_t lastSeen;
    
    Peer() : socket(0), versionReceived(false), verackSent(false), lastSeen(0) {}
};

class P2PServer {
public:
    P2PServer(int port);
    ~P2PServer();

    void Start();
    void Stop();

    void ConnectTo(const std::string& ip, int port);
    
    size_t GetPeerCount() const;

private:
    int port;
    std::atomic<bool> running;
    std::thread listenThread;
    
    std::vector<Peer> peers;
    mutable std::mutex peersMutex;

    void ListenLoop();
    void HandlePeer(Peer peer);
    
    // Protocol Handlers
    void SendVersion(uint64_t socket);
    void SendVerack(uint64_t socket);
};

} // namespace aurelis
