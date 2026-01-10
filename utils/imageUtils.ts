/**
 * Утилиты для работы с оптимизированными изображениями
 */

export type ImageSize = 'thumbnail' | 'medium' | 'large';

export interface ProcessedImage {
    thumbnail: string;
    medium: string;
    large: string;
    originalFormat?: string;
    originalWidth?: number;
    originalHeight?: number;
}

/**
 * Получает URL изображения нужного размера
 * @param imageData - Данные изображения (объект ProcessedImage или Base64/URL строка)
 * @param size - Желаемый размер ('thumbnail', 'medium', 'large')
 * @returns URL изображения
 */
export function getImageUrl(imageData: ProcessedImage | string | undefined, size: ImageSize = 'medium'): string {
    if (!imageData) {
        return 'https://placehold.co/600x400?text=NO+IMAGE';
    }

    // Новый формат (объект с путями к разным размерам)
    if (typeof imageData === 'object' && imageData[size]) {
        return imageData[size];
    }

    // Старый формат (Base64 Data URI или обычный URL)
    if (typeof imageData === 'string') {
        return imageData;
    }

    return 'https://placehold.co/600x400?text=NO+IMAGE';
}

/**
 * Получает URL первого изображения из массива
 * @param imageUrls - Массив изображений
 * @param size - Желаемый размер
 * @returns URL первого изображения
 */
export function getFirstImageUrl(imageUrls: Array<ProcessedImage | string> | undefined, size: ImageSize = 'medium'): string {
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        return 'https://placehold.co/600x400?text=NO+IMAGE';
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
           'thumbnail' in imageData &&
           'medium' in imageData &&
           'large' in imageData;
}

/**
 * Получает все URL изображений нужного размера из массива
 * @param imageUrls - Массив изображений
 * @param size - Желаемый размер
 * @returns Массив URL изображений
 */
export function getAllImageUrls(imageUrls: Array<ProcessedImage | string> | undefined, size: ImageSize = 'medium'): string[] {
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        return ['https://placehold.co/600x400?text=NO+IMAGE'];
    }

    return imageUrls.map(imageData => getImageUrl(imageData, size));
}
