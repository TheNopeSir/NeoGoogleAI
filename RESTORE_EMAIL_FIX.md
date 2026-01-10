# Email Login Fix - Инструкция по восстановлению

## Проблема
Пользователь **Truester** потерял доступ к email **kennyornope@gmail.com** из-за бага в коде, который перезаписывал email пустым значением при редактировании профиля.

## Что было исправлено

### 1. Исправлен баг в `UserProfileView.tsx`
- Добавлена синхронизация состояния `editEmail` с `user.email` через `useEffect`
- Добавлена защита от перезаписи существующего email пустым значением
- Теперь email сохраняется корректно при редактировании профиля

### 2. Добавлен Admin API endpoint для восстановления email
- Endpoint: `POST /api/admin/fix-user-email`
- Позволяет администратору восстановить email любого пользователя через HTTP запрос
- Защищен admin ключом (переменная окружения `ADMIN_KEY`)

### 3. Создан скрипт восстановления `fix-truester-email.js`
Скрипт для восстановления email пользователя Truester через прямое подключение к БД.

## Как восстановить email

### Вариант 1: Через Admin API (рекомендуется)

Отправьте POST запрос на admin endpoint:

```bash
curl -X POST http://localhost:3000/api/admin/fix-user-email \
  -H "Content-Type: application/json" \
  -d '{
    "username": "Truester",
    "email": "kennyornope@gmail.com",
    "adminKey": "YOUR_ADMIN_KEY"
  }'
```

**Важно**: Установите переменную окружения `ADMIN_KEY` с секретным ключом перед использованием:

```bash
export ADMIN_KEY="your-secure-random-key"
```

### Вариант 2: Через скрипт восстановления (на сервере)

На production сервере выполните:

```bash
node fix-truester-email.js
```

Скрипт автоматически восстановит email **kennyornope@gmail.com** для пользователя Truester.

### Вариант 3: Через SQL (прямой доступ к БД)

Если у вас есть прямой доступ к PostgreSQL:

```sql
-- Проверить текущий email
SELECT username, data->>'email' as email
FROM users
WHERE LOWER(username) = 'truester';

-- Восстановить email
UPDATE users
SET data = jsonb_set(data, '{email}', '"kennyornope@gmail.com"'),
    updated_at = NOW()
WHERE LOWER(username) = 'truester';
```

### Вариант 4: Через интерфейс (пользователь может сам)

Пользователь Truester может:

1. Войти через Telegram (это работает)
2. Перейти в свой профиль
3. Нажать кнопку **"Ред."** (Редактировать)
4. Ввести email: **kennyornope@gmail.com**
5. При необходимости установить новый пароль
6. Нажать **"Сохранить"**
7. Теперь можно войти через email и пароль

## Проверка исправления

После восстановления email проверьте:

```bash
# На сервере
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "kennyornope@gmail.com", "password": "USER_PASSWORD"}'
```

Если всё работает, вы получите объект пользователя в ответе.

## Дополнительная информация

### Почему это произошло?

1. Состояние `editEmail` инициализировалось только один раз при первом рендере компонента
2. Если `user.email` был `undefined` в момент инициализации, `editEmail` оставался `undefined`
3. При сохранении профиля `email: undefined` перезаписывал существующий email в базе данных

### Что было сделано для предотвращения?

1. **Синхронизация состояния**: Добавлен `useEffect`, который обновляет `editEmail` при изменении `user.email`
2. **Защита от пустых значений**: Функция сохранения профиля проверяет, что новый email не пустой, прежде чем перезаписывать существующий
3. **Trim значений**: Email очищается от пробелов при сохранении

### Затронутые файлы

- `components/UserProfileView.tsx` - Основной компонент с багом (исправлен)
- `server.js` - Добавлен admin endpoint `/api/admin/fix-user-email`
- `fix-truester-email.js` - Скрипт восстановления email
- `RESTORE_EMAIL_FIX.md` - Эта инструкция

## Контакты

Если у вас возникли вопросы или проблемы с восстановлением, проверьте логи сервера или базы данных.
