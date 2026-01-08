cmake_minimum_required(VERSION 3.15)
project(aurelis-node VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Output directories
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)

# Include directories
include_directories(include)
include_directories(src)

# Source files
set(SOURCES 
    src/main.cpp
    src/chain/block.cpp
    src/chain/tx.cpp
    src/chain/genesis.cpp
    src/chain/blockchain.cpp
    src/chain/mempool.cpp
    src/util/sha256.cpp
    src/rpc/rpc_server.cpp
    src/miner/miner.cpp
    src/net/p2p_server.cpp
    src/util/address.cpp
)

# Executable
add_executable(aurelis-node ${SOURCES})

if(WIN32)
    target_link_libraries(aurelis-node PRIVATE ws2_32)
endif()

# Libraries (Placeholder for now)
# find_package(OpenSSL REQUIRED)
# target_link_libraries(aurelis-node PRIVATE OpenSSL::SSL OpenSSL::Crypto)

# Compiler warnings
if(MSVC)
    target_compile_options(aurelis-node PRIVATE /W4 /WX)
    target_compile_definitions(aurelis-node PRIVATE NOMINMAX WIN32_LEAN_AND_MEAN _WINSOCK_DEPRECATED_NO_WARNINGS)
else()
    target_compile_options(aurelis-node PRIVATE -Wall -Wextra -Wpedantic -Werror)
endif()
