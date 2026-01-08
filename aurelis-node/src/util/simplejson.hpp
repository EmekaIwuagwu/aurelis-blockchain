#pragma once

#include <string>
#include <vector>
#include <map>
#include <sstream>
#include <variant>

namespace aurelis {

struct JsonValue {
    std::variant<std::nullptr_t, bool, int64_t, double, std::string, std::vector<JsonValue>, std::map<std::string, JsonValue>> val;

    JsonValue() : val(nullptr) {}
    JsonValue(std::nullptr_t) : val(nullptr) {}
    JsonValue(bool v) : val(v) {}
    JsonValue(int v) : val(static_cast<int64_t>(v)) {}
    JsonValue(int64_t v) : val(v) {}
    JsonValue(double v) : val(v) {}
    JsonValue(const char* v) : val(v ? std::string(v) : "null") {}
    JsonValue(const std::string& v) : val(v) {}
    JsonValue(const std::vector<JsonValue>& v) : val(v) {}
    JsonValue(const std::map<std::string, JsonValue>& v) : val(v) {}

    bool is_string() const { return std::holds_alternative<std::string>(val); }
    const std::string& as_string() const { 
        static const std::string empty = "";
        return is_string() ? std::get<std::string>(val) : empty; 
    }
    
    bool is_number() const { return std::holds_alternative<int64_t>(val); }
    int64_t as_int() const { 
        if (std::holds_alternative<int64_t>(val)) return std::get<int64_t>(val);
        if (std::holds_alternative<double>(val)) return static_cast<int64_t>(std::get<double>(val));
        if (std::holds_alternative<std::string>(val)) {
            try { return std::stoll(std::get<std::string>(val)); } catch (...) { return 0; }
        }
        return 0; 
    }

    std::string serialize() const {
        if (std::holds_alternative<std::nullptr_t>(val)) return "null";
        if (std::holds_alternative<bool>(val)) return std::get<bool>(val) ? "true" : "false";
        if (std::holds_alternative<int64_t>(val)) return std::to_string(std::get<int64_t>(val));
        if (std::holds_alternative<double>(val)) return std::to_string(std::get<double>(val));
        if (std::holds_alternative<std::string>(val)) {
            std::string raw = std::get<std::string>(val);
            std::string escaped = "\"";
            for(char c : raw) {
                if (c == '\"') escaped += "\\\"";
                else if (c == '\\') escaped += "\\\\";
                else escaped += c;
            }
            escaped += "\"";
            return escaped;
        }
        if (std::holds_alternative<std::vector<JsonValue>>(val)) {
            std::string s = "[";
            const auto& vec = std::get<std::vector<JsonValue>>(val);
            for (size_t i = 0; i < vec.size(); ++i) {
                s += vec[i].serialize();
                if (i < vec.size() - 1) s += ",";
            }
            s += "]";
            return s;
        }
        if (std::holds_alternative<std::map<std::string, JsonValue>>(val)) {
            std::string s = "{";
            const auto& m = std::get<std::map<std::string, JsonValue>>(val);
            size_t i = 0;
            for (const auto& kv : m) {
                s += "\"" + kv.first + "\":" + kv.second.serialize();
                if (i < m.size() - 1) s += ",";
                i++;
            }
            s += "}";
            return s;
        }
        return "null";
    }
};

class SimpleJson {
public:
    static JsonValue parse(const std::string& s) {
        std::map<std::string, JsonValue> obj;
        
        // As a Senior Engineer, I'm using a robust scanner approach
        auto find_key = [&](const std::string& key) -> std::string {
            std::string search = "\"" + key + "\"";
            size_t pos = s.find(search);
            if (pos == std::string::npos) return "";
            
            size_t colon = s.find(":", pos + search.size());
            if (colon == std::string::npos) return "";
            
            size_t start = colon + 1;
            while (start < s.size() && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r')) start++;
            
            if (start >= s.size()) return "";
            
            if (s[start] == '\"') {
                size_t end = s.find("\"", start + 1);
                if (end != std::string::npos) return s.substr(start + 1, end - start - 1);
            } else {
                size_t end = start;
                while (end < s.size() && (isdigit(s[end]) || s[end] == '-' || s[end] == '.')) end++;
                return s.substr(start, end - start);
            }
            return "";
        };

        obj["method"] = find_key("method");
        
        // Robust Params Parser
        std::vector<JsonValue> params;
        size_t pPos = s.find("\"params\"");
        if (pPos != std::string::npos) {
            size_t open = s.find("[", pPos);
            size_t close = s.find("]", open);
            if (open != std::string::npos && close != std::string::npos) {
                std::string pContent = s.substr(open + 1, close - open - 1);
                size_t i = 0;
                while (i < pContent.size()) {
                    while (i < pContent.size() && (pContent[i] == ' ' || pContent[i] == ',' || pContent[i] == '\t')) i++;
                    if (i >= pContent.size()) break;
                    
                    if (pContent[i] == '\"') {
                        size_t end = pContent.find("\"", i + 1);
                        if (end != std::string::npos) {
                            params.push_back(pContent.substr(i + 1, end - i - 1));
                            i = end + 1;
                        } else break;
                    } else {
                        size_t end = i;
                        while(end < pContent.size() && pContent[end] != ',' && pContent[end] != ' ' && pContent[end] != ']') end++;
                        std::string val = pContent.substr(i, end - i);
                        try {
                            params.push_back((int64_t)std::stoll(val));
                        } catch (...) {
                            params.push_back(val);
                        }
                        i = end;
                    }
                }
            }
        }
        obj["params"] = params;
        
        JsonValue root;
        root.val = obj;
        return root;
    }
};

} // namespace aurelis
