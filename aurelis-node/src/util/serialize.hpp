#pragma once

#include <vector>
#include <cstdint>
#include <algorithm>
#include <type_traits>

namespace aurelis {

// Simple serialization buffer
class Serializer {
public:
    std::vector<uint8_t> buffer;

    void write(const void* data, size_t len) {
        const uint8_t* ptr = static_cast<const uint8_t*>(data);
        buffer.insert(buffer.end(), ptr, ptr + len);
    }

    template<typename T>
    Serializer& operator<<(const T& obj) {
        if constexpr (std::is_integral<T>::value) {
            // Little endian encoding for integers
            T val = obj;
            for (size_t i = 0; i < sizeof(T); ++i) {
                buffer.push_back((val >> (i * 8)) & 0xFF);
            }
        } else {
            // Assume obj has Serialize method
            obj.Serialize(*this);
        }
        return *this;
    }
};

class Deserializer {
public:
    const std::vector<uint8_t>& buffer;
    size_t pos;

    Deserializer(const std::vector<uint8_t>& buf) : buffer(buf), pos(0) {}

    void read(void* dest, size_t len) {
        if (pos + len > buffer.size()) throw std::runtime_error("Deserialize underflow");
        std::copy(buffer.begin() + pos, buffer.begin() + pos + len, static_cast<uint8_t*>(dest));
        pos += len;
    }

    template<typename T>
    Deserializer& operator>>(T& obj) {
        if constexpr (std::is_integral<T>::value) {
             if (pos + sizeof(T) > buffer.size()) throw std::runtime_error("Deserialize underflow");
             obj = 0;
             for (size_t i = 0; i < sizeof(T); ++i) {
                 obj |= static_cast<T>(buffer[pos++]) << (i * 8);
             }
        } else {
            obj.Deserialize(*this);
        }
        return *this;
    }
};

// Vector serialization specializations
template<typename T>
Serializer& operator<<(Serializer& s, const std::vector<T>& v) {
    // VarInt size (simplified to uint64 for now)
    uint64_t size = v.size();
    // Compact size encoding would be better (VarInt), using uint64 for simplicity prototype
    s << size; 
    for (const auto& item : v) {
        s << item;
    }
    return s;
}

template<typename T>
Deserializer& operator>>(Deserializer& d, std::vector<T>& v) {
    uint64_t size;
    d >> size;
    v.resize(size);
    for (size_t i = 0; i < size; ++i) {
        d >> v[i];
    }
    return d;
}

} // namespace aurelis
