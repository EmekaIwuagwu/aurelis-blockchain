#pragma once

#include <vector>
#include <string>
#include <algorithm>
#include <iomanip>
#include <sstream>
#include <cstdint>
#include <cstring>
#include <array>

namespace aurelis {

// 256-bit hash container
class uint256 {
public:
    static constexpr size_t WIDTH = 32;
    std::array<uint8_t, WIDTH> data;

    uint256() {
        data.fill(0);
    }

    explicit uint256(const std::vector<uint8_t>& v) {
        if (v.size() == WIDTH) {
            std::copy(v.begin(), v.end(), data.begin());
        } else {
            data.fill(0);
        }
    }

    void SetHex(const std::string& str) {
        data.fill(0);
        for (size_t i = 0; i < str.length() && i < WIDTH * 2; i += 2) {
            std::string byteString = str.substr(i, 2);
            data[i / 2] = (uint8_t)strtol(byteString.c_str(), nullptr, 16);
        }
        // Note: Real impl needs to handle endianness properly (usually internal is little endian)
        // For simplicity here, treating as big-endian byte array for now or just raw bytes.
    }

    std::string ToString() const {
        std::stringstream ss;
        ss << std::hex << std::setfill('0');
        for (const auto& byte : data) {
            ss << std::setw(2) << (int)byte;
        }
        return ss.str();
    }

    bool operator==(const uint256& other) const { return data == other.data; }
    bool operator!=(const uint256& other) const { return data != other.data; }
    
    // For maps/sets
    bool operator<(const uint256& other) const { return data < other.data; }
    
    friend class Serialize;
};

} // namespace aurelis
