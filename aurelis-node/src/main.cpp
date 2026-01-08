#include <iostream>
#include <string>
#include <vector>
#include <thread>
#include <chrono>
#include <ctime>
#include "chain/block.hpp"
#include "chain/genesis.hpp"
#include "util/serialize.hpp"
#include "rpc/rpc_server.hpp"
#include "miner/miner.hpp"
#include "util/address.hpp"
#include "chain/blockchain.hpp"
#include "chain/mempool.hpp"
#include "net/p2p_server.hpp"
#include <exception>

void print_banner() {
    std::cout << "============================================" << std::endl;
    std::cout << "      Aurelis Blockchain Node v0.1.0        " << std::endl;
    std::cout << "      (c) 2026 Republic of Aurelis          " << std::endl;
    std::cout << "============================================" << std::endl;
}

int main(int argc, char* argv[]) {
    try {
        (void)argc;
    (void)argv;
    print_banner();

    std::cout << "[INFO] Initializing Aurelis Node..." << std::endl;
    
    // Verify core structures
    aurelis::Block block;
    block.header.version = 1;
    block.header.timestamp = 1735689600; // 2026-01-01
    
    // Create Genesis Transaction
    aurelis::Transaction tx;
    tx.vin.resize(1);
    tx.vin[0].scriptSig = {0xde, 0xad, 0xbe, 0xef}; // Coinbase data
    tx.vout.resize(1);
    tx.vout[0].value = 50 * 100000000LL;
    
    block.vtx.push_back(tx);
    
    std::cout << "[INFO] Block and Transaction structures initialized." << std::endl;
    
    aurelis::Serializer s;
    s << block;
    std::cout << "[INFO] Serialized block size: " << s.buffer.size() << " bytes" << std::endl;
    
    aurelis::Deserializer d(s.buffer);
    aurelis::Block block2;
    d >> block2;
    
    if (block2.header.timestamp == block.header.timestamp) {
        std::cout << "[SUCCESS] Deserialize verification passed." << std::endl;
    } else {
        std::cout << "[ERROR] Deserialize verification failed!" << std::endl;
    }

    // Create Configured Genesis
    const std::string RESERVE_ADDRESS = "AUR131FCE87dAe14b2A9568D0146950125Fe217Bf0e";
    aurelis::Block genesis = aurelis::Genesis::CreateGenesisBlock(1767916800, 0, 0x1e00ffff, 1, 2500 * 100000000LL, RESERVE_ADDRESS);

    std::cout << "[INFO] Genesis Block Created with Reward to: " << RESERVE_ADDRESS << " (2500 AUC)" << std::endl;
    
    aurelis::BlockChain chain;
    std::cout << "[INFO] Loading blockchain from disk..." << std::endl;
    chain.LoadChain();
    if (chain.GetHeight() == -1) {
        chain.AddBlock(genesis);
    }
    aurelis::Mempool mempool;
    std::cout << "[INFO] Blockchain and Mempool initialized." << std::endl;

    aurelis::RpcServer rpc(18883, chain, mempool);
    rpc.Start();

    aurelis::P2PServer p2p(18882);
    p2p.Start();

    // Give servers time to initialize
    std::this_thread::sleep_for(std::chrono::milliseconds(500));

    std::vector<uint8_t> dummyPkh(20, 0xAB);
    std::cout << "[INFO] Sample Address: " << aurelis::Address::FromPubKeyHash(dummyPkh) << std::endl;

    // Create a NEW block template for mining (Block #1)
    aurelis::Block block1Template = genesis;
    block1Template.header.prev_block = genesis.header.GetHash();
    block1Template.header.timestamp = (uint32_t)std::time(nullptr);
    block1Template.header.nonce = 0;

    aurelis::Miner miner(block1Template, mempool);
    miner.SetBlockFoundCallback([&chain, &miner, &mempool, RESERVE_ADDRESS](const aurelis::Block& b){
        std::cout << "[CALLBACK] New block mined: " << b.header.GetHash().ToString() << std::endl;
        if (chain.AddBlock(b)) {
            std::cout << "[INFO] Block successfully added to chain! New Height: " << chain.GetHeight() << std::endl;
            
            // Clear confirmed transactions from mempool
            mempool.RemoveTransactions(b.vtx);

            // Start mining next block on top of this one
            aurelis::Block nextTemplate = b;
            nextTemplate.header.prev_block = b.header.GetHash();
            nextTemplate.vtx.clear();
            // Re-add coinbase
            aurelis::Transaction coinbase = aurelis::Genesis::CreateGenesisBlock(0,0,0,0, 2500 * 100000000LL, RESERVE_ADDRESS).vtx[0];
            nextTemplate.vtx.push_back(coinbase);
            
            nextTemplate.header.timestamp = (uint32_t)std::time(nullptr);
            nextTemplate.header.nonce = 0;
            nextTemplate.header.bits = 0x1e00ffff; // Slower difficulty
            
            miner.UpdateWork(nextTemplate);
        }
    });
    // Re-enabled mining (2 threads for faster confirmation on this machine)
    miner.Start(2);

    // Transaction Simulator: DISABLED
    /*
    ... (simulator code) ...
    */
    
    std::cout << "[INFO] Transaction Simulator disabled." << std::endl;

    std::cout << "[INFO] Node initialization complete (Phase 1+2+3)." << std::endl;
    std::cout << "[INFO] Press Ctrl+C to exit..." << std::endl;
    
    // Keep alive
    while(true) {
        std::this_thread::sleep_for(std::chrono::seconds(1));
    }
    
    return 0;
    } catch (const std::exception& e) {
        std::cerr << "[FATAL ERROR] Unhandled exception in main: " << e.what() << std::endl;
        return 1;
    } catch (...) {
        std::cerr << "[FATAL ERROR] Unknown exception in main" << std::endl;
        return 1;
    }
}
