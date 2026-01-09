
import { TouchEvent, useState } from 'react';

interface SwipeInput {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
}

interface SwipeOutput {
    onTouchStart: (e: TouchEvent<any>) => void;
    onTouchMove: (e: TouchEvent<any>) => void;
    onTouchEnd: () => void;
}

const useSwipe = ({ onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown }: SwipeInput): SwipeOutput => {
    const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
    const [touchEnd, setTouchEnd] = useState<{ x: number, y: number } | null>(null);

    // Increased threshold to 75px to prevent accidental swipes while scrolling vertically
    const minSwipeDistance = 75;

    const onTouchStart = (e: TouchEvent<any>) => {
        setTouchEnd(null);
        setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };

    const onTouchMove = (e: TouchEvent<any>) => {
        setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distanceX = touchStart.x - touchEnd.x;
        const distanceY = touchStart.y - touchEnd.y;
        const isLeftSwipe = distanceX > minSwipeDistance;
        const isRightSwipe = distanceX < -minSwipeDistance;
        const isUpSwipe = distanceY > minSwipeDistance;
        const isDownSwipe = distanceY < -minSwipeDistance;

        if (Math.abs(distanceX) > Math.abs(distanceY)) {
             // Horizontal
             if (isLeftSwipe && onSwipeLeft) onSwipeLeft();
             if (isRightSwipe && onSwipeRight) onSwipeRight();
        } else {
             // Vertical
             if (isUpSwipe && onSwipeUp) onSwipeUp();
             if (isDownSwipe && onSwipeDown) onSwipeDown();
        }
    };

    return { onTouchStart, onTouchMove, onTouchEnd };
};

export default useSwipe;
