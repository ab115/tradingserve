FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose the configured port
EXPOSE 3001

# Run with host flag to allow external access
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3001"]
