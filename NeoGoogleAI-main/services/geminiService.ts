
// Сервис переведен в режим заглушки (Gemini отключен)
// import { GoogleGenAI } from "@google/genai"; <-- Удалено

export interface GeneratedData {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  specs: Record<string, string>;
  condition_guess: string;
}

// Функция-заглушка. Больше не делает запросов к нейросети.
export const generateArtifactDescription = async (imageData?: string, itemName?: string): Promise<GeneratedData> => {
  console.log("AI Service is disabled. Returning default empty data.");
  
  // Имитация асинхронности, если нужно
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    title: itemName || "",
    description: "",
    category: "ПРОЧЕЕ",
    subcategory: "",
    specs: {},
    condition_guess: ""
  };
};

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
}

const FORBIDDEN_WORDS = [
    'spam', 'casino', 'viagra', 'xxx', 'porn', 'nude', 'hentai', 'nigger', 'faggot'
];

// Локальная модерация по списку слов
export const moderateContent = async (text: string): Promise<ModerationResult> => {
  if (!text) return { allowed: true };
  const cleanText = text.toLowerCase();
  for (const word of FORBIDDEN_WORDS) {
    if (cleanText.includes(word)) {
      return { allowed: false, reason: "ОБНАРУЖЕНО ЗАПРЕЩЕННОЕ СОДЕРЖАНИЕ" };
    }
  }
  return { allowed: true };
};

// Локальная проверка файла
export const moderateImage = async (file: File): Promise<ModerationResult> => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) return { allowed: false, reason: "РАЗМЕР ФАЙЛА ПРЕВЫШАЕТ 10MB" };
    if (!file.type.startsWith('image/')) return { allowed: false, reason: "ФОРМАТ ФАЙЛА НЕ ПОДДЕРЖИВАЕТСЯ" };
    return { allowed: true };
};
