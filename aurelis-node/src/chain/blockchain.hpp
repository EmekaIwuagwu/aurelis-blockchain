#pragma once

#include "chain/block.hpp"
#include <vector>
#include <map>
#include <memory>
#include <mutex>
#include <fstream>

namespace aurelis {


struct BlockIndex {
    uint256 hash;
    BlockHeader header;
    int height;
    
    BlockIndex(const Block& block, int h) : header(block.header), height(h) {
        hash = header.GetHash();
    }
};

struct OutPoint {
    uint256 hash;
    uint32_t n;
    bool operator<(const OutPoint& other) const {
        if (hash != other.hash) return hash.data < other.hash.data;
        return n < other.n;
    }
};

struct UTXO {
    TxOut out;
};

class BlockChain {
public:
    BlockChain();
    
    // Persistence
    void LoadChain();
    void SaveBlock(const Block& block);

    bool AddBlock(const Block& block);
    int GetHeight() const;
    uint256 GetBestHash() const;
    
    // Explorer / Data Retrieval
    Block GetBlock(const uint256& hash) const;
    bool GetTransaction(const uint256& hash, Transaction& outTx, uint256& outBlockHash) const;
    std::shared_ptr<BlockIndex> GetIndex(const uint256& hash) const;
    Block GetBlockByHeight(int height) const;
    
    // UTXO Management (Simplified for prototype)
    int64_t GetBalance(const std::string& address) const;
    std::vector<std::pair<OutPoint, UTXO>> GetUTXOs(const std::string& address) const;

private:
    std::vector<std::shared_ptr<BlockIndex>> chain;
    std::map<uint256, std::shared_ptr<BlockIndex>> blockIndexMap;
    std::map<uint256, Block> blockData;
    
    // UTXO Set
    std::map<OutPoint, UTXO> utxoSet;
    
    mutable std::mutex chainMutex;

    bool ValidateBlock(const Block& block);
};

} // namespace aurelis
