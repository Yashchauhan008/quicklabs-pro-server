# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm install --production

# Install dbmate for migrations (Alpine version)
RUN apk add --no-cache curl \
    && curl -fsSL -o /usr/local/bin/dbmate https://github.com/amacneil/dbmate/releases/latest/download/dbmate-linux-amd64 \
    && chmod +x /usr/local/bin/dbmate \
    && apk del curl

# Copy built files and necessary assets
COPY --from:builder /app/dist ./dist
COPY --from:builder /app/db ./db
COPY --from:builder /app/dbmate.json ./dbmate.json
COPY --from:builder /app/tsconfig.json ./tsconfig.json

# Create logs and uploads directories
RUN mkdir -p logs uploads && chmod 777 logs uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5001

EXPOSE 5001

# Start the application
CMD ["npm", "run", "start"]
