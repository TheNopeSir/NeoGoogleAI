
import { TouchEvent, useRef } from 'react';

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
    // Using refs instead of state to avoid stale closure issues in touch handlers
    const touchStart = useRef<{ x: number, y: number } | null>(null);
    const touchEnd = useRef<{ x: number, y: number } | null>(null);

    // Threshold: 75px prevents accidental swipes during vertical scroll
    const minSwipeDistance = 75;

    const onTouchStart = (e: TouchEvent<any>) => {
        touchEnd.current = null;
        touchStart.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
    };

    const onTouchMove = (e: TouchEvent<any>) => {
        touchEnd.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
    };

    const onTouchEnd = () => {
        if (!touchStart.current || !touchEnd.current) return;

        const distanceX = touchStart.current.x - touchEnd.current.x;
        const distanceY = touchStart.current.y - touchEnd.current.y;
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
