# Инструкция по установке прав администратора

## Способ 1: Через API (рекомендуется)

После запуска сервера выполните:

```bash
curl -X POST http://localhost:3002/api/admin/set-admin \
  -H "Content-Type: application/json" \
  -d '{"email": "kennyornope@gmail.com", "adminKey": "change-me-in-production"}'
```

## Способ 2: Через SQL (прямой доступ к БД)

Подключитесь к PostgreSQL и выполните:

```sql
-- Найти пользователя
SELECT username, data->>'email' as email, data->>'isAdmin' as isAdmin
FROM users
WHERE LOWER(TRIM(data->>'email')) = 'kennyornope@gmail.com';

-- Установить isAdmin
UPDATE users
SET data = jsonb_set(data, '{isAdmin}', 'true', true),
    updated_at = NOW()
WHERE LOWER(TRIM(data->>'email')) = 'kennyornope@gmail.com';

-- Проверить результат
SELECT username, data->>'email' as email, data->>'isAdmin' as isAdmin
FROM users
WHERE LOWER(TRIM(data->>'email')) = 'kennyornope@gmail.com';
```

## Способ 3: Через веб-интерфейс (browser console)

Откройте консоль браузера на странице приложения и выполните:

```javascript
fetch('/api/admin/set-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: 'kennyornope@gmail.com',
        adminKey: 'change-me-in-production'
    })
})
.then(r => r.json())
.then(console.log);
```

После установки прав администратора:
1. Перелогиньтесь в приложении
2. Теперь при редактировании артефактов вы увидите поле "Владелец артефакта (только для суперадминов)"
3. Через это поле можно менять владельца артефакта
