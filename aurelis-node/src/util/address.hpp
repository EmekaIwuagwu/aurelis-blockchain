#pragma once

#include <string>
#include <vector>
#include <cstdint>
#include <algorithm>

namespace aurelis {

class Base58 {
public:
    static std::string Encode(const std::vector<uint8_t>& input);
    // Simple version for prototype
};

class Address {
public:
    static std::string FromPubKeyHash(const std::vector<uint8_t>& pkh) {
        // Bitcoin-style: version + pkh + checksum
        // Aurelis version: 0x00 (mapped to AUR prefix) or custom
        std::vector<uint8_t> data;
        // In real Bitcoin, version byte 0x00 -> '1...'
        // To get 'AUR...', we can either use a custom prefix string or 
        // just prepend "AUR" to the base58 of the hash.
        
        // Per spec: "addresses must start with the ASCII characters AUR"
        // Simplest: "AUR" + Base58(pkh + checksum)
        
        std::vector<uint8_t> payload = pkh;
        // Todo: Add 4-byte checksum (first 4 bytes of double sha256)
        
        return "AUR" + Base58::Encode(payload);
    }
};

} // namespace aurelis
