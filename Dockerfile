# ---------- BUILD ----------
    FROM node:18-alpine AS builder
    WORKDIR /app

    COPY package.json package-lock.json ./
    RUN npm ci

    COPY . .
    RUN npm run build

    # ---------- RUN ----------
    FROM node:18-alpine AS runner
    WORKDIR /app

    RUN npm install -g dbmate

    COPY package.json package-lock.json ./
    RUN npm ci --omit=dev && npm cache clean --force

    RUN mkdir -p logs uploads

    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/db ./db


    EXPOSE 3003
    CMD ["sh", "-c", "npx dbmate up && npm run start"]
