#!/bin/bash

# ========================================
# Скрипт миграции NeoArchive на NeoBD
# Рабочая директория: /app
# ========================================

cd /app

echo "🚀 Миграция NeoArchive: Supabase → NeoBD"
echo "📁 Рабочая директория: $(pwd)"
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ========================================
# Шаг 1: Проверка окружения
# ========================================

echo "📋 Шаг 1: Проверка окружения"

if [ -z "$OLD_SUPABASE_URL" ]; then
    echo -e "${RED}❌ OLD_SUPABASE_URL не установлен!${NC}"
    echo ""
    echo "Выполните:"
    echo 'export OLD_SUPABASE_URL="https://kovcgjtqbvmuzhsrcktd.supabase.co"'
    exit 1
fi

if [ -z "$OLD_SUPABASE_SERVICE_KEY" ]; then
    echo -e "${RED}❌ OLD_SUPABASE_SERVICE_KEY не установлен!${NC}"
    echo ""
    echo "Выполните:"
    echo 'export OLD_SUPABASE_SERVICE_KEY="ваш-service-role-ключ"'
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL не установлен (потребуется для импорта)${NC}"
    echo ""
    echo "Для импорта выполните:"
    echo 'export DATABASE_URL="postgresql://gen_user:ПАРОЛЬ@10485197b297c9ddd0cd3434.twc1.net:5432/default_db?sslmode=require"'
    echo ""
fi

echo -e "${GREEN}✅ Переменные окружения проверены${NC}"
echo ""

# ========================================
# Шаг 2: Экспорт из Supabase
# ========================================

echo "📦 Шаг 2: Экспорт данных из Supabase"
echo ""

node migration-export.js

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Ошибка при экспорте данных${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Экспорт завершён${NC}"
echo ""

# ========================================
# Шаг 3: Проверка данных
# ========================================

echo "🔍 Шаг 3: Проверка экспортированных данных"
echo ""

if [ ! -d "migration-data" ]; then
    echo -e "${RED}❌ Директория migration-data не найдена${NC}"
    exit 1
fi

echo "Найдены файлы:"
ls -lh migration-data/*.json | awk '{print "  " $9 " (" $5 ")"}'
echo ""

# ========================================
# Шаг 4: Инструкция для импорта
# ========================================

echo "📋 Следующие шаги:"
echo ""
echo "1️⃣ Создайте схему в NeoBD:"
echo "   - Откройте NeoBD → SQL Editor"
echo "   - Выполните содержимое файла: schema-postgres.sql"
echo ""
echo "   ИЛИ через командную строку:"
echo '   psql "$DATABASE_URL" < schema-postgres.sql'
echo ""
echo "2️⃣ Импортируйте данные:"
echo '   export DATABASE_URL="postgresql://gen_user:ПАРОЛЬ@10485197b297c9ddd0cd3434.twc1.net:5432/default_db?sslmode=require"'
echo "   npm run migrate:import:pg"
echo ""
echo "3️⃣ Обновите код:"
echo "   cp server-postgres.js server.js"
echo ""
echo "4️⃣ Создайте .env:"
echo "   cat > .env << EOF"
echo "   NODE_ENV=production"
echo "   PORT=3000"
echo '   DATABASE_URL=postgresql://gen_user:ПАРОЛЬ@10485197b297c9ddd0cd3434.twc1.net:5432/default_db?sslmode=require'
echo "   EOF"
echo ""
echo "5️⃣ Тестируйте:"
echo "   npm run build"
echo "   npm start"
echo ""

echo -e "${GREEN}✅ Экспорт завершён успешно!${NC}"
echo ""
