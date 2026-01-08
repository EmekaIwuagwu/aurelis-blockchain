#pragma once

#include <vector>
#include <string>
#include <cstdint>
#include "util/serialize.hpp"

namespace aurelis {

const uint32_t NET_MAGIC = 0x4155524C; // "AURL"

struct NetMessageHeader {
    uint32_t magic;
    char command[12];
    uint32_t length;
    uint32_t checksum;

    NetMessageHeader() : magic(NET_MAGIC), length(0), checksum(0) {
        for(int i=0; i<12; ++i) command[i] = 0;
    }

    void SetCommand(const std::string& cmd) {
        for(int i=0; i<12; ++i) {
            command[i] = (i < cmd.length()) ? cmd[i] : 0;
        }
    }

    void Serialize(Serializer& s) const {
        s << magic;
        s.write((uint8_t*)command, 12);
        s << length;
        s << checksum;
    }

    void Deserialize(Deserializer& d) {
        d >> magic;
        d.read((uint8_t*)command, 12);
        d >> length;
        d >> checksum;
    }
};

struct VersionMessage {
    int32_t version;
    uint64_t services;
    int64_t timestamp;
    int32_t start_height;

    VersionMessage() : version(1), services(0), timestamp(0), start_height(0) {}

    void Serialize(Serializer& s) const {
        s << version;
        s << services;
        s << timestamp;
        s << start_height;
    }

    void Deserialize(Deserializer& d) {
        d >> version;
        d >> services;
        d >> timestamp;
        d >> start_height;
    }
};

} // namespace aurelis
