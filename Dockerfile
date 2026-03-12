FROM node:20-alpine

WORKDIR /app

# Копируем файлы package.json и package-lock.json (если есть)
COPY package.json package-lock.json* ./

# Устанавливаем зависимости
RUN npm install

# Устанавливаем бинарники sharp для Alpine Linux (musl libc)
RUN npm install --os=linux --libc=musl --cpu=x64 sharp

# Копируем исходный код проекта
COPY . .

# Собираем фронтенд (Vite build -> dist)
RUN npm run build

# Открываем порт 3002
EXPOSE 3002

# Запускаем сервер
CMD ["npm", "start"]