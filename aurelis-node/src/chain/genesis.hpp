#pragma once

#include "chain/block.hpp"

namespace aurelis {

class Genesis {
public:
    static Block CreateGenesisBlock(uint32_t nTime, uint32_t nNonce, uint32_t nBits, int32_t nVersion, int64_t genesisReward, const std::string& rewardAddress = "");
};

} // namespace aurelis
