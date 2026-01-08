#pragma once

#include "chain/tx.hpp"
#include "util/hash.hpp"
#include "util/serialize.hpp"
#include <vector>

namespace aurelis {

class BlockHeader {
public:
    int32_t version;
    uint256 prev_block;
    uint256 merkle_root;
    uint32_t timestamp;
    uint32_t bits;
    uint32_t nonce;

    BlockHeader() : version(1), timestamp(0), bits(0), nonce(0) {}

    void Serialize(Serializer& s) const {
        s << version;
        s.write(prev_block.data.data(), prev_block.data.size());
        s.write(merkle_root.data.data(), merkle_root.data.size());
        s << timestamp;
        s << bits;
        s << nonce;
    }

    void Deserialize(Deserializer& d) {
        d >> version;
        d.read(prev_block.data.data(), prev_block.data.size());
        d.read(merkle_root.data.data(), merkle_root.data.size());
        d >> timestamp;
        d >> bits;
        d >> nonce;
    }
    
    uint256 GetHash() const;
};

class Block {
public:
    BlockHeader header;
    std::vector<Transaction> vtx;

    void Serialize(Serializer& s) const {
        s << header;
        s << vtx;
    }

    void Deserialize(Deserializer& d) {
        d >> header;
        d >> vtx;
    }
};

} // namespace aurelis
