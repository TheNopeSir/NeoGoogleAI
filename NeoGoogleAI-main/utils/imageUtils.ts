
/**
 * Утилиты для работы с оптимизированными изображениями
 */

import { ProcessedImage } from '../types';

export type ImageSize = 'thumbnail' | 'medium' | 'large' | 'placeholder';

const PLACEHOLDER = 'https://placehold.co/600x400?text=NO+IMAGE';

/**
 * Получает URL изображения нужного размера.
 * Гарантированно возвращает строку.
 * 
 * @param imageData - Данные изображения (объект ProcessedImage или Base64/URL строка)
 * @param size - Желаемый размер ('thumbnail', 'medium', 'large')
 * @returns URL изображения (строка)
 */
export function getImageUrl(imageData: ProcessedImage | string | undefined | any, size: ImageSize = 'medium'): string {
    if (!imageData) {
        return PLACEHOLDER;
    }

    // Если это старый формат (строка - URL или Base64)
    if (typeof imageData === 'string') {
        // Защита от [object Object] если вдруг строка пришла битой
        if (imageData === '[object Object]') return PLACEHOLDER;
        return imageData;
    }

    // Если это новый формат (объект с путями)
    if (typeof imageData === 'object') {
        // 1. Попытка получить запрошенный размер
        if (imageData[size] && typeof imageData[size] === 'string') {
            return imageData[size];
        }

        // 2. Фоллбеки на другие размеры (от большего к меньшему или наоборот, главное найти строку)
        const candidates = [
            imageData.medium,
            imageData.large,
            imageData.thumbnail,
            imageData.placeholder
        ];

        for (const candidate of candidates) {
            if (candidate && typeof candidate === 'string') {
                return candidate;
            }
        }
        
        // 3. Если это объект, но в нем нет нужных полей, возможно это File объект (при загрузке)
        if (imageData instanceof File) {
             return URL.createObjectURL(imageData);
        }
    }

    return PLACEHOLDER;
}

/**
 * Получает URL первого изображения из массива
 * @param imageUrls - Массив изображений
 * @param size - Желаемый размер
 * @returns URL первого изображения
 */
export function getFirstImageUrl(imageUrls: Array<ProcessedImage | string> | undefined, size: ImageSize = 'medium'): string {
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        return PLACEHOLDER;
    }

    return getImageUrl(imageUrls[0], size);
}

/**
 * Проверяет, является ли изображение обработанным (новый формат)
 * @param imageData - Данные изображения
 * @returns true если это ProcessedImage объект
 */
export function isProcessedImage(imageData: any): imageData is ProcessedImage {
    return typeof imageData === 'object' &&
           imageData !== null &&
           ('thumbnail' in imageData || 'medium' in imageData);
}

/**
 * Получает все URL изображений нужного размера из массива
 * @param imageUrls - Массив изображений
 * @param size - Желаемый размер
 * @returns Массив URL изображений
 */
export function getAllImageUrls(imageUrls: Array<ProcessedImage | string> | undefined, size: ImageSize = 'medium'): string[] {
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        return [PLACEHOLDER];
    }

    return imageUrls.map(imageData => getImageUrl(imageData, size));
}
