# ========================
# Stage 1: Builder
# Устанавливает все зависимости (включая devDeps) и собирает фронтенд
# ========================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Устанавливаем бинарники sharp для Alpine Linux (musl libc)
RUN npm install --os=linux --libc=musl --cpu=x64 sharp

COPY . .
RUN npm run build

# ========================
# Stage 2: Production
# Только runtime-зависимости + собранный dist
# ========================
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Устанавливаем бинарники sharp для Alpine Linux (musl libc)
RUN npm install --os=linux --libc=musl --cpu=x64 sharp

# Копируем серверный код и конфигурацию
COPY server.js adminAPI.js imageProcessor.js emailTemplates.js ./
COPY services/s3Service.js ./services/
# Копируем переменные окружения (содержит учётные данные БД, SMTP, S3)
COPY .env .env

# Копируем собранный фронтенд из builder-стадии
COPY --from=builder /app/dist ./dist

EXPOSE 3002

CMD ["node", "server.js"]
