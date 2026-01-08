#pragma once

#include "util/hash.hpp"
#include "util/serialize.hpp"
#include <vector>

namespace aurelis {

class TxIn {
public:
    uint256 prevout_hash;
    uint32_t prevout_n;
    std::vector<uint8_t> scriptSig;
    uint32_t sequence;

    TxIn() : prevout_n(0), sequence(0xFFFFFFFF) {}

    void Serialize(Serializer& s) const {
        s.write(prevout_hash.data.data(), prevout_hash.data.size());
        s << prevout_n;
        s << scriptSig; 
        s << sequence;
    }

    void Deserialize(Deserializer& d) {
        d.read(prevout_hash.data.data(), prevout_hash.data.size());
        d >> prevout_n;
        d >> scriptSig;
        d >> sequence;
    }
};

class TxOut {
public:
    int64_t value;
    std::vector<uint8_t> scriptPubKey;

    TxOut() : value(-1) {}
    TxOut(int64_t val, const std::vector<uint8_t>& script) : value(val), scriptPubKey(script) {}

    void Serialize(Serializer& s) const {
        s << value;
        s << scriptPubKey;
    }

    void Deserialize(Deserializer& d) {
        d >> value;
        d >> scriptPubKey;
    }
};

class Transaction {
public:
    int32_t version;
    std::vector<TxIn> vin;
    std::vector<TxOut> vout;
    uint32_t lockTime;

    Transaction() : version(1), lockTime(0) {}

    void Serialize(Serializer& s) const {
        s << version;
        s << vin;
        s << vout;
        s << lockTime;
    }

    void Deserialize(Deserializer& d) {
        d >> version;
        d >> vin;
        d >> vout;
        d >> lockTime;
    }
    
    // Todo: Compute Hash
    uint256 GetHash() const;
};

} // namespace aurelis
