
import React, { useState } from 'react';

interface ProgressiveImageProps {
    imageData: string;
    alt: string;
    className?: string;
    size?: 'thumbnail' | 'medium' | 'large';
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({ imageData, alt, className = '', size = 'medium' }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    return (
        <div className={`relative overflow-hidden ${className} bg-gray-900/20`}>
            {/* Placeholder Skeleton */}
            {!isLoaded && !hasError && (
                <div className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white/50 rounded-full animate-spin"></div>
                </div>
            )}

            {/* Actual Image */}
            <img
                src={imageData}
                alt={alt}
                loading="lazy"
                className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setIsLoaded(true)}
                onError={() => {
                    setHasError(true);
                    setIsLoaded(true); // Stop loading spinner
                }}
            />

            {/* Error State */}
            {hasError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white/30 text-[10px] font-pixel">
                    IMG_ERR
                </div>
            )}
        </div>
    );
};

export default ProgressiveImage;
