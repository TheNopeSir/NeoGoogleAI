import React, { useState, useEffect, useRef } from 'react';
import { ProcessedImage } from '../types';

interface ProgressiveImageProps {
  imageData: ProcessedImage | string | undefined;
  alt: string;
  className?: string;
  size?: 'thumbnail' | 'medium' | 'large';
  priority?: boolean; // Disable lazy loading for above-the-fold images
}

/**
 * Прогрессивный компонент изображения с lazy loading и blur placeholder
 *
 * Особенности:
 * - Lazy loading через Intersection Observer API
 * - Blur placeholder для мгновенной отрисовки
 * - Плавные переходы между состояниями
 * - Поддержка старых base64 изображений
 * - Оптимизация для производительности
 */
export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  imageData,
  alt,
  className = '',
  size = 'thumbnail',
  priority = false
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority); // Если priority=true, загружаем сразу
  const imgRef = useRef<HTMLImageElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);

  // Получаем URL изображений
  const getImageUrl = (): string => {
    if (!imageData) return 'https://placehold.co/600x400?text=NO+IMAGE';

    if (typeof imageData === 'object') {
      return imageData[size] || imageData.medium || imageData.thumbnail;
    }

    // Старый формат (base64)
    return imageData;
  };

  const getPlaceholderUrl = (): string | null => {
    if (!imageData || typeof imageData !== 'object') return null;
    return imageData.placeholder || null;
  };

  const imageUrl = getImageUrl();
  const placeholderUrl = getPlaceholderUrl();

  // Lazy loading через Intersection Observer
  useEffect(() => {
    if (priority || !imgRef.current) return; // Если priority, не используем lazy loading

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect(); // Отключаем observer после первой загрузки
          }
        });
      },
      {
        rootMargin: '200px', // Начинаем загрузку за 200px до появления в viewport
        threshold: 0.01
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  // Обработчик загрузки изображения
  const handleLoad = () => {
    setIsLoaded(true);
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Placeholder - размытое изображение */}
      {placeholderUrl && !isLoaded && (
        <div
          ref={placeholderRef}
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            backgroundImage: `url(${placeholderUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(20px)',
            transform: 'scale(1.1)', // Чуть увеличиваем, чтобы скрыть края размытия
            opacity: isLoaded ? 0 : 1
          }}
        />
      )}

      {/* Основное изображение */}
      <img
        ref={imgRef}
        src={isInView ? imageUrl : placeholderUrl || ''} // Загружаем только когда в viewport
        alt={alt}
        onLoad={handleLoad}
        loading={priority ? 'eager' : 'lazy'} // Native lazy loading как fallback
        className={`
          relative z-10 w-full h-full object-cover
          transition-opacity duration-500
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          // Предотвращаем layout shift
          minHeight: '100%',
          minWidth: '100%'
        }}
      />

      {/* Скелетон на время загрузки (если нет placeholder) */}
      {!placeholderUrl && !isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-700 via-gray-600 to-gray-700 animate-pulse" />
      )}
    </div>
  );
};

export default ProgressiveImage;
