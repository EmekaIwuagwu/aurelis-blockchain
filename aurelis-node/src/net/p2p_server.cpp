#include "net/p2p_server.hpp"
#include "net/net_messages.hpp"
#include "util/hash.hpp"
#include "util/sha256.hpp"
#include <iostream>
#include <chrono>

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "Ws2_32.lib")
#define socklen_t int
#else
#define SOCKET int
#define INVALID_SOCKET -1
#define SOCKET_ERROR -1
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#endif

namespace aurelis {

P2PServer::P2PServer(int p) : port(p), running(false) {
#ifdef _WIN32
    WSADATA wsaData;
    WSAStartup(MAKEWORD(2, 2), &wsaData);
#endif
}

P2PServer::~P2PServer() {
    Stop();
}

void P2PServer::Start() {
    if (running) return;
    running = true;
    listenThread = std::thread(&P2PServer::ListenLoop, this);
    std::cout << "[P2P] Server started on port " << port << std::endl;
}

void P2PServer::Stop() {
    running = false;
    // Real implementation would close all sockets
    if (listenThread.joinable()) listenThread.join();
}

void P2PServer::ListenLoop() {
    SOCKET server_fd;
    struct sockaddr_in address;
    int opt = 1;

    if ((server_fd = socket(AF_INET, SOCK_STREAM, 0)) == INVALID_SOCKET) return;

#ifdef _WIN32
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, (const char*)&opt, sizeof(opt));
#else
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
#endif

    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(static_cast<u_short>(port));

    if (bind(server_fd, (struct sockaddr*)&address, sizeof(address)) == SOCKET_ERROR) return;
    if (listen(server_fd, 3) == SOCKET_ERROR) return;

    while (running) {
        struct sockaddr_in peer_addr;
        int addrlen = sizeof(peer_addr);
        SOCKET new_socket = accept(server_fd, (struct sockaddr*)&peer_addr, (socklen_t*)&addrlen);
        
        if (new_socket != INVALID_SOCKET) {
            Peer p;
            p.ip = inet_ntoa(peer_addr.sin_addr);
            p.port = ntohs(peer_addr.sin_port);
            p.socket = new_socket;
            
            std::cout << "[P2P] New connection from " << p.ip << ":" << p.port << std::endl;
            
            std::thread(&P2PServer::HandlePeer, this, p).detach();
        }
    }
}

void P2PServer::HandlePeer(Peer peer) {
    // 1. Send our version
    SendVersion(peer.socket);
    
    while (running) {
        NetMessageHeader h;
        std::vector<uint8_t> h_buf(24);
        int received = recv((SOCKET)peer.socket, (char*)h_buf.data(), 24, MSG_WAITALL);
        
        if (received <= 0) break;
        if (received < 24) continue;

        Deserializer d(h_buf);
        h.Deserialize(d);

        if (h.magic != NET_MAGIC) {
            std::cout << "[P2P] Invalid magic from " << peer.ip << std::endl;
            break;
        }

        std::string cmd(h.command); 
        std::cout << "[P2P] Received Command: '" << cmd << "' (" << h.length << " bytes) from " << peer.ip << std::endl;

        std::vector<uint8_t> payload(h.length);
        if (h.length > 0) {
            recv((SOCKET)peer.socket, (char*)payload.data(), h.length, MSG_WAITALL);
        }

        if (cmd == "version") {
            Deserializer d_payload(payload);
            VersionMessage v;
            v.Deserialize(d_payload);
            std::cout << "[P2P] Peer Version: " << v.version << " | Height: " << v.start_height << std::endl;
            SendVerack(peer.socket);
        } else if (cmd == "verack") {
            std::cout << "[P2P] Handshake complete with " << peer.ip << std::endl;
        }
    }
    
    std::cout << "[P2P] Peer disconnected: " << peer.ip << std::endl;
#ifdef _WIN32
    closesocket((SOCKET)peer.socket);
#else
    close((SOCKET)peer.socket);
#endif
}

void P2PServer::SendVersion(uint64_t socket) {
    VersionMessage v;
    v.version = 1;
    v.timestamp = std::chrono::system_clock::to_time_t(std::chrono::system_clock::now());
    v.start_height = 0; // Todo: Get actual height
    
    Serializer s;
    v.Serialize(s);
    
    NetMessageHeader h;
    h.SetCommand("version");
    h.length = (uint32_t)s.buffer.size();
    
    // Checksum: first 4 bytes of double sha256
    uint256 hash;
    Hash256(s.buffer.data(), s.buffer.size(), hash.data.data());
    h.checksum = *((uint32_t*)hash.data.data());

    Serializer h_ser;
    h.Serialize(h_ser);
    
    send((SOCKET)socket, (const char*)h_ser.buffer.data(), (int)h_ser.buffer.size(), 0);
    send((SOCKET)socket, (const char*)s.buffer.data(), (int)s.buffer.size(), 0);
    
    std::cout << "[P2P] Sent 'version' to socket " << socket << std::endl;
}

void P2PServer::SendVerack(uint64_t socket) {
    NetMessageHeader h;
    h.SetCommand("verack");
    h.length = 0;
    h.checksum = 0x5df6e0e2; // Checksum of empty payload in Bitcoin

    Serializer s;
    h.Serialize(s);
    send((SOCKET)socket, (const char*)s.buffer.data(), (int)s.buffer.size(), 0);
    std::cout << "[P2P] Sent 'verack' to socket " << socket << std::endl;
}

void P2PServer::ConnectTo(const std::string& ip, int p) {
    SOCKET sock = socket(AF_INET, SOCK_STREAM, 0);
    struct sockaddr_in serv_addr;
    serv_addr.sin_family = AF_INET;
    serv_addr.sin_port = htons(static_cast<u_short>(p));
    
    if (inet_pton(AF_INET, ip.c_str(), &serv_addr.sin_addr) <= 0) return;
    
    if (connect(sock, (struct sockaddr*)&serv_addr, sizeof(serv_addr)) < 0) {
        std::cout << "[P2P] Failed to connect to " << ip << ":" << p << std::endl;
        return;
    }
    
    Peer peer;
    peer.ip = ip;
    peer.port = p;
    peer.socket = sock;
    
    std::cout << "[P2P] Successfully connected to " << ip << ":" << p << std::endl;
    std::thread(&P2PServer::HandlePeer, this, peer).detach();
}

size_t P2PServer::GetPeerCount() const {
    std::lock_guard<std::mutex> lock(peersMutex);
    return peers.size();
}

} // namespace aurelis
