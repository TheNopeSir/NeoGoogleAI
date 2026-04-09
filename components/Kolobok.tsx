import React from 'react';
import { getKolobokSrc } from '../utils/koloboks';

interface KolobokProps {
    emoji: string;
    size?: number;
    className?: string;
}

const Kolobok: React.FC<KolobokProps> = ({ emoji, size = 24, className = '' }) => {
    const src = getKolobokSrc(emoji);
    if (src) {
        const isGif = src.endsWith('.gif');
        return (
            <img
                src={src}
                alt={emoji}
                width={size}
                height={size}
                className={`inline-block select-none ${isGif ? 'rounded' : ''} ${className}`}
                draggable={false}
                onError={(e) => {
                    // fallback to emoji if image fails
                    const span = document.createElement('span');
                    span.textContent = emoji;
                    e.currentTarget.replaceWith(span);
                }}
            />
        );
    }
    return <span className={className}>{emoji}</span>;
};

export default Kolobok;
