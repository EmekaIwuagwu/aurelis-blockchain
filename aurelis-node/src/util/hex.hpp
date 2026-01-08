#pragma once

#include <string>
#include <vector>
#include <iomanip>
#include <sstream>

namespace aurelis {

class HexUtil {
public:
    static std::vector<uint8_t> Decode(const std::string& hex) {
        std::vector<uint8_t> bytes;
        for (size_t i = 0; i < hex.length(); i += 2) {
            std::string byteString = hex.substr(i, 2);
            uint8_t byte = (uint8_t) strtol(byteString.c_str(), NULL, 16);
            bytes.push_back(byte);
        }
        return bytes;
    }

    static std::string Encode(const std::vector<uint8_t>& bytes) {
        std::stringstream ss;
        ss << std::hex << std::setfill('0');
        for (uint8_t b : bytes) {
            ss << std::setw(2) << (int)b;
        }
        return ss.str();
    }
};

} // namespace aurelis
