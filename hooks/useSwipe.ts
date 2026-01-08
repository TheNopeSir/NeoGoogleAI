
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
    const [touchStart, setTouchStart] = useState<{ x: number, y: number, time: number } | null>(null);
    const [touchEnd, setTouchEnd] = useState<{ x: number, y: number } | null>(null);

    // Reduced threshold for easier swiping
    const minSwipeDistance = 50; 
    const maxSwipeTime = 1000; // ms

    const onTouchStart = (e: TouchEvent<any>) => {
        setTouchEnd(null);
        setTouchStart({ 
            x: e.targetTouches[0].clientX, 
            y: e.targetTouches[0].clientY,
            time: Date.now()
        });
    };

    const onTouchMove = (e: TouchEvent<any>) => {
        setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
        
        // Optional: Prevent vertical scrolling if detecting horizontal swipe early
        if (touchStart) {
            const dx = e.targetTouches[0].clientX - touchStart.x;
            const dy = e.targetTouches[0].clientY - touchStart.y;
            if (Math.abs(dx) > Math.abs(dy) && (onSwipeLeft || onSwipeRight)) {
                // e.preventDefault(); // Warning: Needs passive: false listener to work, React synthetic events make this tricky
            }
        }
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distanceX = touchStart.x - touchEnd.x;
        const distanceY = touchStart.y - touchEnd.y;
        const timeElapsed = Date.now() - touchStart.time;

        if (timeElapsed > maxSwipeTime) return; // Too slow, probably a scroll

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
