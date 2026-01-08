#pragma once
#include <string>
#include <vector>
#include <cstdint>

namespace aurelis {

class SHA256 {
public:
    static constexpr size_t DIGEST_SIZE = 32;

    SHA256();
    void Update(const uint8_t* data, size_t len);
    void Update(const std::string& str);
    void Final(uint8_t* digest);
    
    // Convenience
    static std::string HashToString(const std::string& input);
    static std::vector<uint8_t> Hash(const std::vector<uint8_t>& input);

private:
    uint8_t data[64];
    uint32_t datalen;
    uint64_t bitlen;
    uint32_t state[8];
    
    void Transform();
};

// Double SHA256 (Hash256) used in Bitcoin/Aurelis
inline void Hash256(const uint8_t* input, size_t len, uint8_t* output32) {
    SHA256 ctx;
    ctx.Update(input, len);
    uint8_t intermediate[32];
    ctx.Final(intermediate);
    
    SHA256 ctx2;
    ctx2.Update(intermediate, 32);
    ctx2.Final(output32);
}

} // namespace aurelis
