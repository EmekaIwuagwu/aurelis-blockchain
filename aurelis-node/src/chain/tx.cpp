#include "chain/block.hpp"
#include "chain/tx.hpp"
#include "util/sha256.hpp"
// Need SHA256 implementation
// For now returning dummy hash
#include <iostream>

namespace aurelis {

uint256 Transaction::GetHash() const {
    Serializer s;
    s << *this;
    uint256 hash;
    Hash256(s.buffer.data(), s.buffer.size(), hash.data.data());
    return hash;
}

}
