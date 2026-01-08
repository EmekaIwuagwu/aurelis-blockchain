#pragma once

#include "chain/tx.hpp"
#include <map>
#include <vector>
#include <mutex>

namespace aurelis {

class Mempool {
public:
    Mempool();
    
    // Returns true if transaction was added
    bool AddTransaction(const Transaction& tx);
    
    // Get all transactions in the pool
    std::vector<Transaction> GetTransactions() const;
    
    // Remove transactions (e.g. after they are included in a block)
    void RemoveTransactions(const std::vector<Transaction>& txs);
    
    size_t Size() const;
    bool Contains(const uint256& hash) const;

private:
    std::map<uint256, Transaction> pool;
    mutable std::mutex mempoolMutex;

    bool ValidateTransaction(const Transaction& tx);
};

} // namespace aurelis
