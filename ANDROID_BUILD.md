# Сборка Android APK для NeoArchive

Чтобы создать APK файл, выполните следующие шаги.

## 1. Подготовка окружения

Убедитесь, что у вас установлены:
- Node.js (v18+)
- Android Studio (последняя версия)
- Java JDK 17

## 2. Установка зависимостей

В корне проекта выполните:
```bash
npm install
```

## 3. Настройка адреса API

Мобильное приложение не может обращаться к `localhost` вашего компьютера. Вы должны указать адрес вашего публичного API (сервера).

Создайте или отредактируйте файл `.env.production` (или просто `.env`) и добавьте:

```env
VITE_API_URL=https://api.neoarchive.ru/api
```
*(Замените URL на ваш реальный адрес сервера, где запущен `server.js`)*

## 4. Сборка веб-части

Соберите фронтенд:
```bash
npm run build:full
```

## 5. Инициализация Android проекта

Если вы делаете это впервые:
```bash
npx cap add android
```

## 6. Синхронизация и открытие Android Studio

```bash
npx cap sync android
npx cap open android
```

## 7. Сборка APK в Android Studio

1. Дождитесь индексации проекта в Android Studio.
2. В меню выберите: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
3. После завершения, уведомление покажет путь к файлу `app-debug.apk`.

Теперь этот файл можно установить на телефон.