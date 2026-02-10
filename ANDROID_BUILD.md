# Сборка Android APK для NeoArchive

## 1. Подготовка
Убедитесь, что у вас установлены:
- Node.js (v18+)
- Android Studio
- Java JDK 17+

## 2. Настройка сервера
Мобильное приложение требует HTTPS соединение с сервером.
В файле `.env` укажите публичный URL вашего API:

```env
VITE_API_URL=https://api.neoarchive.ru/api
```

## 3. Сборка APK

### Вариант А: Быстрая сборка через терминал
Эта команда соберет проект и создаст `.apk` файл без открытия Android Studio.

```bash
npm run android:apk
```

Файл будет находиться здесь:
`android/app/build/outputs/apk/debug/app-debug.apk`

### Вариант Б: Через Android Studio (для отладки/релиза)
1. Запустите студию с проектом:
   ```bash
   npm run android:open
   ```
2. Дождитесь синхронизации Gradle.
3. В меню выберите: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

## 4. Релиз (Signed APK)
Для публикации в Google Play используйте меню **Build > Generate Signed Bundle / APK** в Android Studio и следуйте инструкциям по созданию ключа подписи.
