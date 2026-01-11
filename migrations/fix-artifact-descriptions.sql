-- =====================================================
-- Миграция: Исправление описаний, комментариев и характеристик артефактов
-- Дата: 2026-01-11
-- Описание: Исправляет отсутствующие или некорректные данные в артефактах
-- =====================================================

-- Шаг 1: Добавляем отсутствующие поля description, comments, specs
UPDATE exhibits
SET data = jsonb_set(
    jsonb_set(
        jsonb_set(
            data,
            '{description}',
            CASE
                WHEN data->>'description' IS NULL OR LENGTH(TRIM(data->>'description')) < 5 THEN
                    to_jsonb(
                        COALESCE(data->>'title', 'Артефакт') ||
                        ' - уникальный экспонат коллекции.' ||
                        CASE WHEN data->>'category' IS NOT NULL THEN ' Категория: ' || (data->>'category') || '.' ELSE '' END ||
                        CASE WHEN data->>'subcategory' IS NOT NULL THEN ' Подкатегория: ' || (data->>'subcategory') || '.' ELSE '' END
                    )
                ELSE
                    data->'description'
            END,
            true
        ),
        '{comments}',
        CASE
            WHEN data->'comments' IS NULL OR jsonb_typeof(data->'comments') != 'array' THEN
                '[]'::jsonb
            ELSE
                data->'comments'
        END,
        true
    ),
    '{specs}',
    CASE
        WHEN data->'specs' IS NULL OR jsonb_typeof(data->'specs') != 'object' THEN
            '{}'::jsonb
        ELSE
            data->'specs'
    END,
    true
)
WHERE
    data->>'description' IS NULL
    OR LENGTH(TRIM(data->>'description')) < 5
    OR data->'comments' IS NULL
    OR jsonb_typeof(data->'comments') != 'array'
    OR data->'specs' IS NULL
    OR jsonb_typeof(data->'specs') != 'object';

-- Проверка результатов
SELECT
    COUNT(*) as total_artifacts,
    COUNT(CASE WHEN data->>'description' IS NOT NULL AND LENGTH(TRIM(data->>'description')) >= 5 THEN 1 END) as with_description,
    COUNT(CASE WHEN data->'comments' IS NOT NULL AND jsonb_typeof(data->'comments') = 'array' THEN 1 END) as with_comments_array,
    COUNT(CASE WHEN data->'specs' IS NOT NULL AND jsonb_typeof(data->'specs') = 'object' THEN 1 END) as with_specs_object
FROM exhibits;
