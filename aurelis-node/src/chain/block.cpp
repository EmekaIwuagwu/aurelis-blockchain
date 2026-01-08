#include "chain/block.hpp"

#include "util/sha256.hpp"

namespace aurelis {

uint256 BlockHeader::GetHash() const {
    Serializer s;
    s << *this;
    uint256 hash;
    Hash256(s.buffer.data(), s.buffer.size(), hash.data.data());
    return hash;
}

}
