#!/bin/bash

# Простой способ создать файл бэкапа
# Вставьте JSON содержимое бэкапа когда будет предложено

echo "📝 Создание файла бэкапа..."
echo ""
echo "Вставьте содержимое JSON бэкапа и нажмите Ctrl+D когда закончите:"
echo ""

BACKUP_FILE="backup_restore_$(date +%s).json"

cat > "$BACKUP_FILE"

if [ -s "$BACKUP_FILE" ]; then
    echo ""
    echo "✅ Файл создан: $BACKUP_FILE"
    echo "📊 Размер: $(du -h "$BACKUP_FILE" | cut -f1)"
    echo ""
    echo "Проверка JSON..."
    if jq empty "$BACKUP_FILE" 2>/dev/null; then
        echo "✅ JSON валидный"
        COUNT=$(jq '.count' "$BACKUP_FILE" 2>/dev/null)
        echo "📦 Артефактов в бэкапе: $COUNT"
    else
        echo "⚠️  JSON может быть невалидным"
    fi
    echo ""
    echo "Для восстановления запустите:"
    echo "  node restoreFromBackup.js $BACKUP_FILE"
else
    echo "❌ Файл не создан"
    rm -f "$BACKUP_FILE"
fi
