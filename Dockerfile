# Этап 1: Сборка фронтенда
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем все зависимости (включая devDependencies для сборки Vite)
RUN npm install

# Копируем исходный код
COPY . .

# Собираем проект (создается папка dist)
RUN npm run build

# Этап 2: Запуск сервера
FROM node:20-alpine

WORKDIR /app

# Копируем package.json для установки только продуктовых зависимостей
COPY package*.json ./

# Устанавливаем только зависимости, нужные для работы сервера (без Vite)
RUN npm install --omit=dev

# Копируем собранный фронтенд из предыдущего этапа
COPY --from=builder /app/dist ./dist

# Копируем файлы сервера (оба варианта + db.js для PostgreSQL)
COPY server.js server-postgres.js db.js ./

# Создаем папку для данных
RUN mkdir -p data

# Переменные окружения по умолчанию
ENV PORT=3000
ENV HOST=0.0.0.0

# Открываем порт
EXPOSE 3000

# Запускаем сервер (используем npm start, который запустит server-postgres.js)
CMD ["npm", "start"]