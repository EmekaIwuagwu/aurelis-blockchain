#include "rpc/rpc_server.hpp"
#include "chain/blockchain.hpp"
#include "chain/mempool.hpp"
#include "chain/tx.hpp"
#include "util/hex.hpp"
#include <iostream>
#include <sstream>

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "Ws2_32.lib")
#else
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#endif

namespace aurelis {

RpcServer::RpcServer(int p, BlockChain& chain, Mempool& mp) : port(p), blockchain(chain), mempool(mp), running(false) {
#ifdef _WIN32
    WSADATA wsaData;
    WSAStartup(MAKEWORD(2, 2), &wsaData);
#endif
}

RpcServer::~RpcServer() {
    Stop();
#ifdef _WIN32
    WSACleanup();
#endif
}

void RpcServer::Start() {
    running = true;
    serverThread = std::thread(&RpcServer::RunLoop, this);
}

void RpcServer::Stop() {
    running = false;
    if (serverThread.joinable()) {
        serverThread.join();
    }
}

void RpcServer::RunLoop() {
    SOCKET server_fd;
    struct sockaddr_in address;
    int addrlen = sizeof(address);

#ifdef _WIN32
    server_fd = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
#else
    server_fd = socket(AF_INET, SOCK_STREAM, 0);
#endif

    if (server_fd == INVALID_SOCKET) {
        std::cerr << "[ERROR] RPC Socket creation failed: " << WSAGetLastError() << std::endl;
        return;
    }

    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(static_cast<u_short>(port));

    if (bind(server_fd, (struct sockaddr *)&address, sizeof(address)) < 0) {
        std::cerr << "[ERROR] RPC Bind failed on port " << port << std::endl;
        return;
    }

    if (listen(server_fd, 10) < 0) {
        std::cerr << "[ERROR] RPC Listen failed" << std::endl;
        return;
    }

    std::cout << "[INFO] RPC Server listening on port " << port << std::endl;

    while (running) {
        SOCKET new_socket;
#ifdef _WIN32
        new_socket = accept(server_fd, (struct sockaddr *)&address, (int*)&addrlen);
#else
        new_socket = accept(server_fd, (struct sockaddr *)&address, (socklen_t*)&addrlen);
#endif
        if (new_socket == INVALID_SOCKET) continue;

        // Use a detached thread for each request to prevent blocking
        std::thread([this, new_socket]() {
            try {
                char buffer[8192] = {0};
                int valread = recv(new_socket, buffer, 8192, 0);
                if (valread > 0) {
                    std::string request(buffer, valread);
                    
                    if (request.find("OPTIONS") == 0) {
                        std::string response = 
                            "HTTP/1.1 204 No Content\r\n"
                            "Access-Control-Allow-Origin: *\r\n"
                            "Access-Control-Allow-Methods: POST, GET, OPTIONS\r\n"
                            "Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With\r\n"
                            "Access-Control-Max-Age: 86400\r\n"
                            "Connection: close\r\n\r\n";
                        send(new_socket, response.c_str(), static_cast<int>(response.length()), 0);
                    } else {
                        // Senior Engineer Fix: Robust body extraction by finding first '{'
                        size_t brace = request.find("{");
                        std::string body = (brace != std::string::npos) ? request.substr(brace) : "";

                        std::string responseBody = HandleRequest(body);
                        
                        std::string response = 
                            "HTTP/1.1 200 OK\r\n"
                            "Content-Type: application/json\r\n"
                            "Access-Control-Allow-Origin: *\r\n"
                            "Access-Control-Allow-Methods: POST, GET, OPTIONS\r\n"
                            "Access-Control-Allow-Headers: Content-Type, Authorization\r\n"
                            "Content-Length: " + std::to_string(responseBody.length()) + "\r\n"
                            "Connection: close\r\n\r\n" + 
                            responseBody;

                        send(new_socket, response.c_str(), static_cast<int>(response.length()), 0);
                    }
                }
#ifdef _WIN32
                closesocket(new_socket);
#else
                close(new_socket);
#endif
            } catch (const std::exception& e) {
                std::cerr << "[RPC THREAD ERROR] " << e.what() << std::endl;
            } catch (...) {
                std::cerr << "[RPC THREAD ERROR] Unknown exception" << std::endl;
            }
        }).detach();
    }
}

std::string RpcServer::HandleRequest(const std::string& requestBody) {
    try {
        std::cout << "\n[RPC DEBUG] --- NEW REQUEST ---" << std::endl;
        if (requestBody.empty()) {
            std::cout << "[RPC DEBUG] ERROR: Empty body" << std::endl;
            return "{\"error\": \"Empty body\", \"id\": null}";
        }
        std::cout << "[RPC DEBUG] RAW: [" << requestBody << "]" << std::endl;
        
        auto req = SimpleJson::parse(requestBody);
        
        std::string method = "";
        std::vector<JsonValue> params;
        
        if (std::holds_alternative<std::map<std::string, JsonValue>>(req.val)) {
            auto map = std::get<std::map<std::string, JsonValue>>(req.val);
            if (map.count("method") && map["method"].is_string()) {
                method = map["method"].as_string();
            }
            if (map.count("params") && std::holds_alternative<std::vector<JsonValue>>(map["params"].val)) {
                params = std::get<std::vector<JsonValue>>(map["params"].val);
            }
        }
        
        std::cout << "[RPC DEBUG] PARSED METHOD: [" << method << "]" << std::endl;
        std::cout << "[RPC DEBUG] PARSED PARAMS: " << params.size() << std::endl;
        
        std::string response = "{\"jsonrpc\":\"2.0\",\"id\":1,";
        
        try {
            JsonValue res = Dispatch(method, params);
            std::string serialized = res.serialize();
            std::cout << "[RPC DEBUG] DISPATCH RESULT: [" << (serialized.size() > 100 ? serialized.substr(0, 100) + "..." : serialized) << "]" << std::endl;
            response += "\"result\":" + serialized + "}";
        } catch (const std::exception& e) {
            std::cout << "[RPC DEBUG] DISPATCH EXCEPTION: " << e.what() << std::endl;
            response += "\"error\":\"Dispatch failed: " + std::string(e.what()) + "\"}";
        } catch (...) {
            std::cout << "[RPC DEBUG] DISPATCH UNKNOWN EXCEPTION" << std::endl;
            response += "\"error\":\"Dispatch failed\"}";
        }
        
        std::cout << "[RPC DEBUG] --- END REQUEST ---\n" << std::endl << std::flush;
        return response;
    } catch (const std::exception& e) {
        std::cerr << "[RPC ERROR] " << e.what() << std::endl;
        return "{\"error\": \"Exception\"}";
    } catch (...) {
        return "{\"error\": \"Terminal\"}";
    }
}

JsonValue RpcServer::Dispatch(const std::string& method, const std::vector<JsonValue>& params) {
    // Thread-safe access to blockchain and mempool
    std::lock_guard<std::mutex> lock(mtx);
    
    try {
        if (method == "getblockchaininfo") {
            std::map<std::string, JsonValue> info;
            info["blocks"] = (int64_t)blockchain.GetHeight();
            info["bestblockhash"] = blockchain.GetBestHash().ToString();
            info["moneysupply"] = (int64_t)(blockchain.GetHeight() + 1) * 2500;
            return JsonValue(info);
        }

    if (method == "getblockcount") {
        return JsonValue((int64_t)blockchain.GetHeight());
    }
    if (method == "getbestblockhash") {
        return JsonValue(blockchain.GetBestHash().ToString());
    }
    if (method == "echo") {
        return JsonValue("Aurelis Node is Alive");
    }
    if (method == "getmininginfo") {
        std::map<std::string, JsonValue> info;
        info["blocks"] = (int64_t)blockchain.GetHeight();
        info["difficulty"] = 1.0;
        info["networkhashps"] = 0;
        info["chain"] = "main";
        return JsonValue(info);
    }
    if (method == "getmempoolinfo") {
        std::map<std::string, JsonValue> info;
        info["size"] = (int64_t)mempool.Size();
        return JsonValue(info);
    }
    
    if (method == "getblock") {
        if (params.empty()) return JsonValue("Missing block hash/height");
        Block block;
        uint256 hash;
        
        if (params[0].is_string()) {
            std::string s = params[0].as_string();
            // Assuming hash is hex string
             if (s.length() == 64) {
                 hash.SetHex(s);
                 block = blockchain.GetBlock(hash);
             } else {
                 return JsonValue("Invalid hash format");
             }
        } else if (params[0].is_number()) {
            // Support getblock by height for convenience
            int h = (int)params[0].as_int(); // Simplistic conversion
             block = blockchain.GetBlockByHeight(h);
        }

        if (block.header.timestamp == 0) return JsonValue("Block not found");

        std::map<std::string, JsonValue> res;
        res["hash"] = block.header.GetHash().ToString();
        res["confirmations"] = (int64_t)(blockchain.GetHeight() - (blockchain.GetIndex(block.header.GetHash())->height)) + 1;
        res["size"] = (int64_t)100; // Mock size
        res["height"] = (int64_t)blockchain.GetIndex(block.header.GetHash())->height;
        res["version"] = (int64_t)block.header.version;
        res["merkleroot"] = block.header.merkle_root.ToString();
        
        std::vector<JsonValue> txs;
        for (const auto& tx : block.vtx) txs.push_back(JsonValue(tx.GetHash().ToString()));
        res["tx"] = JsonValue(txs);
        
        res["time"] = (int64_t)block.header.timestamp;
        res["nonce"] = (int64_t)block.header.nonce;
        res["bits"] = (int64_t)block.header.bits;
        res["difficulty"] = 1.0;
        res["previousblockhash"] = block.header.prev_block.ToString();
        
        return JsonValue(res);
    }

    if (method == "gettransaction") {
        if (params.empty()) return JsonValue("Missing txid");
        std::string txidStr = "";
        if (params[0].is_string()) txidStr = params[0].as_string();
        
        uint256 txid; 
        txid.SetHex(txidStr);
        
        Transaction tx;
        uint256 blockHash;
        if (blockchain.GetTransaction(txid, tx, blockHash)) {
            std::map<std::string, JsonValue> res;
            res["txid"] = txidStr;
            res["version"] = (int64_t)1;
            res["blockhash"] = blockHash.ToString();
            // Add time if we had it, for now use block lookup or current
            
            std::vector<JsonValue> vin;
            for(const auto& in : tx.vin) {
               std::map<std::string, JsonValue> i;
               i["coinbase"] = std::string((const char*)in.scriptSig.data(), in.scriptSig.size()); 
               vin.push_back(JsonValue(i));
            }
            res["vin"] = JsonValue(vin);

            std::vector<JsonValue> vout;
            for(size_t i=0; i<tx.vout.size(); i++) {
               const auto& out = tx.vout[i];
               std::map<std::string, JsonValue> o;
               o["value"] = (double)out.value / 100000000.0;
               o["n"] = (int64_t)i;
               o["scriptPubKey"] = std::map<std::string, JsonValue>{
                   {"asm", std::string((const char*)out.scriptPubKey.data(), out.scriptPubKey.size())},
                   {"hex", ""} // Mock
               };
               vout.push_back(JsonValue(o));
            }
            res["vout"] = JsonValue(vout);
            return JsonValue(res);
        } else {
             return JsonValue("Transaction not found");
        }
    }
    if (method == "getaddresstransactions") {
        std::string targetAddr = "";
        if (!params.empty() && params[0].is_string()) targetAddr = params[0].as_string();
        
        std::vector<JsonValue> txs;
        int height = blockchain.GetHeight();
        int count = 0;
        
        for (int h = height; h >= 0 && count < 50; --h) {
            Block block = blockchain.GetBlockByHeight(h);
            for (const auto& tx : block.vtx) {
                bool isRelevant = false;
                bool isSender = false;
                int64_t receivedSum = 0;
                std::string fromAddr = "";
                std::string toAddr = "";

                // Check if we are the sender by looking at inputs
                for (const auto& in : tx.vin) {
                    std::string inSig = std::string((const char*)in.scriptSig.data(), in.scriptSig.size());
                    if (inSig == targetAddr) {
                        isSender = true;
                        isRelevant = true;
                    }
                    if (fromAddr == "") fromAddr = inSig;
                }

                // Check outputs for relevance and to find recipient/amount
                for (const auto& out : tx.vout) {
                    std::string outAddr = std::string((const char*)out.scriptPubKey.data(), out.scriptPubKey.size());
                    if (outAddr == targetAddr) {
                        isRelevant = true;
                        receivedSum += out.value;
                    } else {
                        if (toAddr == "") toAddr = outAddr;
                    }
                }

                if (isRelevant) {
                    std::map<std::string, JsonValue> t;
                    t["hash"] = tx.GetHash().ToString();
                    t["timestamp"] = "Block #" + std::to_string(h);

                    if (isSender) {
                        // We are the sender. Calculate amount sent to others.
                        int64_t sentTotal = 0;
                        for (const auto& out : tx.vout) {
                            std::string outAddr = std::string((const char*)out.scriptPubKey.data(), out.scriptPubKey.size());
                            if (outAddr != targetAddr) {
                                sentTotal += out.value;
                                toAddr = outAddr; // Recipient is the person who is NOT us
                            }
                        }
                        t["type"] = "send";
                        t["amount"] = sentTotal;
                        t["address"] = toAddr.empty() ? "Self" : toAddr;
                    } else {
                        // We are purely a receiver
                        bool isMined = (tx.vin.size() == 1 && tx.vin[0].scriptSig.size() >= 4 && 
                                       memcmp(tx.vin[0].scriptSig.data(), "MINT", 4) == 0);
                        if (isMined || h == 0) {
                            t["type"] = "mined";
                            t["address"] = "Imperial Treasury";
                        } else {
                            t["type"] = "receive";
                            t["address"] = fromAddr.empty() ? "Unknown" : fromAddr;
                        }
                        t["amount"] = receivedSum;
                    }
                    
                    txs.push_back(JsonValue(t));
                    count++;
                }
            }
        }
        return JsonValue(txs);
    }
    if (method == "mint") {
        if (params.size() < 2) return JsonValue("Error: Usage 'mint <address> <amount_satoshi>'");
        std::string target = params[0].as_string();
        int64_t amount = params[1].as_int();

        Transaction tx;
        tx.version = 1;
        tx.vin.resize(1);
        // Minting signature 0x4D, 0x49, 0x4E, 0x54 (MINT)
        tx.vin[0].scriptSig = {0x4D, 0x49, 0x4E, 0x54}; 
        tx.vout.resize(1);
        tx.vout[0].value = amount;
        tx.vout[0].scriptPubKey = std::vector<uint8_t>(target.begin(), target.end());

        if (mempool.AddTransaction(tx)) {
            return JsonValue(tx.GetHash().ToString());
        } else {
            return JsonValue("Error: Failed to add mint transaction to mempool");
        }
    }
    if (method == "transfer") {
        if (params.size() < 3) return JsonValue("Error: Usage 'transfer <from> <to> <amount_satoshi>'");
        std::string from = params[0].as_string();
        std::string to = params[1].as_string();
        int64_t amount = params[2].as_int();

        auto utxos = blockchain.GetUTXOs(from);
        int64_t total = 0;
        std::vector<std::pair<OutPoint, UTXO>> selected;
        for (const auto& u : utxos) {
            total += u.second.out.value;
            selected.push_back(u);
            if (total >= amount) break;
        }

        if (total < amount) return JsonValue("Error: Insufficient balance");

        Transaction tx;
        tx.version = 1;
        // Inputs
        for (const auto& s : selected) {
            TxIn in;
            in.prevout_hash = s.first.hash;
            in.prevout_n = s.first.n;
            // For prototype without real signing, we put a "SIGNED" stub
            in.scriptSig = std::vector<uint8_t>(from.begin(), from.end());
            tx.vin.push_back(in);
        }
        // Outputs
        tx.vout.push_back(TxOut(amount, std::vector<uint8_t>(to.begin(), to.end())));
        // Change
        if (total > amount) {
            tx.vout.push_back(TxOut(total - amount, std::vector<uint8_t>(from.begin(), from.end())));
        }

        if (mempool.AddTransaction(tx)) {
            return JsonValue(tx.GetHash().ToString());
        } else {
            return JsonValue("Error: Failed to add transfer to mempool");
        }
    }
    if (method == "getproposals") {
        std::vector<JsonValue> props;
        
        std::map<std::string, JsonValue> p1;
        p1["id"] = "1";
        p1["title"] = "Imperial Library Endowment";
        p1["status"] = "Active";
        p1["votes"] = "14,205";
        p1["end"] = "3 days left";
        props.push_back(JsonValue(p1));

        std::map<std::string, JsonValue> p2;
        p2["id"] = "2";
        p2["title"] = "Expand P2P Network capacity";
        p2["status"] = "Active";
        p2["votes"] = "8,421";
        p2["end"] = "5 days left";
        props.push_back(JsonValue(p2));

        return JsonValue(props);
    }
    if (method == "getaddressbalance") {
        if (params.empty()) return (int64_t)0;
        
        // Find the address string anywhere in params
        std::string addr = "";
        for (const auto& p : params) {
            if (p.is_string()) {
                addr = p.as_string();
                break;
            }
        }
        
        if (addr.empty()) return (int64_t)0;
        return (int64_t)blockchain.GetBalance(addr);
    }
    if (method == "sendrawtransaction") {
        if (params.empty()) return "No hex provided";
        std::string hex = params[0].as_string();
        
        try {
            std::vector<uint8_t> data = HexUtil::Decode(hex);
            Deserializer d(data);
            Transaction tx;
            tx.Deserialize(d);
            
            if (mempool.AddTransaction(tx)) {
                return tx.GetHash().ToString();
            } else {
                return "Transaction rejected (invalid or exists)";
            }
        } catch (const std::exception& e) {
            return std::string("Error: ") + e.what();
        }
    }
    return JsonValue("Method not found");
    } catch (const std::exception& e) {
        std::cerr << "[RPC ERROR] Exception in Dispatch (" << method << "): " << e.what() << std::endl;
        return JsonValue("Internal error");
    } catch (...) {
        std::cerr << "[RPC ERROR] Unknown exception in Dispatch" << std::endl;
        return JsonValue("Internal error");
    }
}

} // namespace aurelis
