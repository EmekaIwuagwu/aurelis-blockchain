#include "chain/genesis.hpp"
#include "util/sha256.hpp"

namespace aurelis {

Block Genesis::CreateGenesisBlock(uint32_t nTime, uint32_t nNonce, uint32_t nBits, int32_t nVersion, int64_t genesisReward, const std::string& rewardAddress) {
    Transaction txNew;
    txNew.version = 1;
    txNew.vin.resize(1);
    txNew.vout.resize(1);
    
    // Genesis Coinbase Data: "2026-01-08 Aurelis Republic Established"
    const char* pszTimestamp = "2026-01-08 Aurelis Republic Established";
    txNew.vin[0].scriptSig = std::vector<uint8_t>(pszTimestamp, pszTimestamp + strlen(pszTimestamp));
    
    txNew.vout[0].value = genesisReward;
    if (!rewardAddress.empty()) {
        txNew.vout[0].scriptPubKey = std::vector<uint8_t>(rewardAddress.begin(), rewardAddress.end());
    } else {
        txNew.vout[0].scriptPubKey = std::vector<uint8_t>(); // Empty
    }

    Block genesis;
    genesis.header.version = nVersion;
    genesis.header.prev_block = uint256(); // Zero
    genesis.header.timestamp = nTime;
    genesis.header.bits = nBits;
    genesis.header.nonce = nNonce;
    genesis.vtx.push_back(txNew);
    
    // Compute Merkle Root (Simplified for single tx)
    genesis.header.merkle_root = txNew.GetHash(); 
    
    return genesis;
}

} // namespace aurelis
