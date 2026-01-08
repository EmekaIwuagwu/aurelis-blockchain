FROM ubuntu:22.04

# Install build dependencies
RUN apt-get update && apt-get install -y \
    cmake \
    g++ \
    make \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy source code
COPY . .

# Build the node
RUN mkdir -p build && cd build && \
    cmake .. && \
    make

# Expose RPC and P2P ports
EXPOSE 18883 18888

# Run the node
CMD ["./build/bin/aurelis-node"]
