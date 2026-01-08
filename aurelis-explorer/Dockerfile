FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose Explorer port (configured to 3001 in vite.config.ts)
EXPOSE 3001

# Run in dev mode, bound to all interfaces
CMD ["npm", "run", "dev", "--", "--host"]
