#!/bin/bash

# Простой скрипт импорта SQL дампа

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Загрузка переменных окружения
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

DB_USER=${DB_USER:-gen_user}
DB_HOST=${DB_HOST:-185.152.92.64}
DB_NAME=${DB_NAME:-default_db}
DB_PASS=${DB_PASSWORD:-'9H@DDCb.gQm.S}'}

SQL_FILE=$1
EXECUTE=${2:-""}

if [ -z "$SQL_FILE" ]; then
    echo -e "${RED}❌ Не указан SQL файл${NC}\n"
    echo "Использование:"
    echo "  ./importSQL.sh <backup.sql>           - Анализ"
    echo "  ./importSQL.sh <backup.sql> --execute - Импорт"
    echo ""
    echo "Пример:"
    echo -e "  ${BLUE}./importSQL.sh default_db1.sql --execute${NC}"
    exit 1
fi

if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}❌ Файл не найден: $SQL_FILE${NC}"
    exit 1
fi

echo "═══════════════════════════════════════════"
echo "   SQL IMPORT - NeoArchive"
echo "═══════════════════════════════════════════"
echo ""

# Информация о файле
FILE_SIZE=$(du -h "$SQL_FILE" | cut -f1)
LINE_COUNT=$(wc -l < "$SQL_FILE")

echo -e "${BLUE}📄 SQL файл:${NC} $SQL_FILE"
echo -e "${BLUE}📊 Размер:${NC} $FILE_SIZE"
echo -e "${BLUE}📝 Строк:${NC} $LINE_COUNT"
echo ""

# Анализ содержимого
echo -e "${BLUE}🔍 Анализ содержимого:${NC}"
if grep -q "exhibits" "$SQL_FILE"; then
    echo -e "  ${GREEN}✅${NC} Таблица exhibits найдена"
else
    echo -e "  ${YELLOW}⚠️${NC}  Таблица exhibits не найдена"
fi

if grep -qi "INSERT\|COPY" "$SQL_FILE"; then
    echo -e "  ${GREEN}✅${NC} INSERT/COPY операции найдены"
else
    echo -e "  ${YELLOW}⚠️${NC}  INSERT/COPY операции не найдены"
fi

if grep -q "imageUrls" "$SQL_FILE"; then
    IMAGE_COUNT=$(grep -o "imageUrls" "$SQL_FILE" | wc -l)
    echo -e "  ${GREEN}✅${NC} imageUrls найдено: $IMAGE_COUNT раз"
else
    echo -e "  ${YELLOW}⚠️${NC}  imageUrls не найдено"
fi

echo ""

if [ "$EXECUTE" != "--execute" ]; then
    echo -e "${YELLOW}🧪 РЕЖИМ АНАЛИЗА${NC}"
    echo ""
    echo "Для импорта запустите:"
    echo -e "  ${GREEN}./importSQL.sh $SQL_FILE --execute${NC}"
    echo ""
    exit 0
fi

echo -e "${GREEN}✅ РЕЖИМ ИМПОРТА${NC}"
echo ""

# Создание бэкапа текущей БД
echo -e "${BLUE}💾 Создание резервной копии...${NC}"
if command -v node &> /dev/null; then
    node backupDatabase.js 2>/dev/null || echo -e "${YELLOW}⚠️  Бэкап не создан (продолжаем)${NC}"
else
    echo -e "${YELLOW}⚠️  Node.js не найден, бэкап не создан${NC}"
fi

echo ""
echo -e "${BLUE}📥 Импорт SQL дампа...${NC}"
echo ""

# Проверка доступности БД
echo "Проверка подключения к БД..."
if PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Подключение к БД успешно${NC}"
else
    echo -e "${RED}❌ Не удается подключиться к БД${NC}"
    echo ""
    echo "Возможные причины:"
    echo "  1. БД недоступна (проверьте сеть/VPN)"
    echo "  2. Неверные credentials в .env"
    echo "  3. Требуется firewall/security group настройка"
    echo ""
    echo "Проверьте настройки:"
    echo "  Host: $DB_HOST"
    echo "  User: $DB_USER"
    echo "  DB:   $DB_NAME"
    exit 1
fi

# Импорт SQL
echo ""
echo "Импортируем SQL дамп..."
if PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"; then
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
    echo -e "${GREEN}   ✅ ИМПОРТ ЗАВЕРШЕН${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
    echo ""

    # Статистика
    echo "📊 Проверка результатов..."
    EXHIBIT_COUNT=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM exhibits;" 2>/dev/null | xargs)
    echo -e "${GREEN}✅ Артефактов в БД: $EXHIBIT_COUNT${NC}"

    echo ""
    echo "📋 Следующие шаги:"
    echo ""
    echo "  1. Создайте JSON бэкап (опционально):"
    echo -e "     ${BLUE}node backupDatabase.js${NC}"
    echo ""
    echo "  2. Проверьте изображения:"
    echo -e "     ${BLUE}node diagnoseImages.js${NC}"
    echo ""
    echo "  3. Мигрируйте base64 → WebP:"
    echo -e "     ${BLUE}node migrateImages.js --execute${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Ошибка импорта SQL${NC}"
    echo ""
    echo "Попробуйте импортировать вручную:"
    echo -e "${YELLOW}PGPASSWORD='$DB_PASS' psql -h $DB_HOST -U $DB_USER -d $DB_NAME < $SQL_FILE${NC}"
    exit 1
fi
