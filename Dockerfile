# ========================
# Stage 1: Builder
# Устанавливает все зависимости (включая devDeps) и собирает фронтенд
# ========================
FROM node:20-alpine AS builder

WORKDIR /app

RUN echo "[1/4] Installing dependencies..."
COPY package.json package-lock.json* ./
RUN npm ci

RUN echo "[2/4] Installing sharp (linux/musl)..."
RUN npm install --os=linux --libc=musl --cpu=x64 sharp

RUN echo "[3/4] Copying source and building frontend..."
COPY . .
RUN npm run build

RUN echo "[4/4] Builder stage complete."

# ========================
# Stage 2: Production
# Только runtime-зависимости + собранный dist
# Переменные окружения передаются через панель Timeweb (не через .env файл)
# ========================
FROM node:20-alpine

WORKDIR /app

RUN echo "[prod 1/3] Installing production dependencies..."
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

RUN echo "[prod 2/3] Installing sharp (linux/musl)..."
RUN npm install --os=linux --libc=musl --cpu=x64 sharp

RUN echo "[prod 3/3] Copying server files..."
COPY server.js adminAPI.js imageProcessor.js emailTemplates.js ./
COPY services/s3Service.js ./services/
COPY .env .env

# Копируем собранный фронтенд из builder-стадии
COPY --from=builder /app/dist ./dist

RUN echo "Build complete. Container ready."

EXPOSE 3002

CMD ["node", "server.js"]
