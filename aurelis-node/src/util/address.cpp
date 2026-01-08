#include "util/address.hpp"
#include <vector>

namespace aurelis {

static const char* ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

std::string Base58::Encode(const std::vector<uint8_t>& input) {
    std::string result;
    std::vector<uint8_t> temp = input;
    
    // Very simplified Base58 encoding (BigInt approach needed for real efficiency)
    // For prototype, using a simple but slow conversion
    
    int zeros = 0;
    while (zeros < (int)temp.size() && temp[zeros] == 0) zeros++;
    
    std::vector<uint8_t> b58((temp.size() * 138 / 100) + 1, 0);
    for (size_t i = zeros; i < temp.size(); i++) {
        int carry = temp[i];
        for (int j = (int)b58.size() - 1; j >= 0; j--) {
            carry += 256 * b58[j];
            b58[j] = carry % 58;
            carry /= 58;
        }
    }
    
    auto it = std::find_if(b58.begin(), b58.end(), [](uint8_t v) { return v != 0; });
    while (it != b58.end()) {
        result += ALPHABET[*it];
        it++;
    }
    
    return std::string(zeros, '1') + result;
}

} // namespace aurelis
