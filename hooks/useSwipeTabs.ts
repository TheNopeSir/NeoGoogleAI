import { useRef, useState } from 'react';
import type { TouchEvent } from 'react';

interface UseSwipeTabsInput {
  tabCount: number;
  currentIndex: number;
  onNavigate: (direction: 'prev' | 'next') => void;
  threshold?: number;
}

export interface UseSwipeTabsOutput {
  dragX: number;
  isDragging: boolean;
  handlers: {
    onTouchStart: (e: TouchEvent<any>) => void;
    onTouchMove: (e: TouchEvent<any>) => void;
    onTouchEnd: () => void;
  };
}

/**
 * Telegram-style swipe between tabs.
 * - Content follows the finger in real time (dragX).
 * - Rubber-bands on first/last tab edges.
 * - Switches tab when drag exceeds threshold, then resets.
 */
const useSwipeTabs = ({
  tabCount,
  currentIndex,
  onNavigate,
  threshold = 70,
}: UseSwipeTabsInput): UseSwipeTabsOutput => {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const axisLocked = useRef<'h' | 'v' | null>(null);
  const latestDx = useRef(0);

  const onTouchStart = (e: TouchEvent<any>) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    axisLocked.current = null;
    latestDx.current = 0;
  };

  const onTouchMove = (e: TouchEvent<any>) => {
    if (!touchStart.current) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;

    // Determine swipe axis once after first 8px of movement
    if (axisLocked.current === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      axisLocked.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }
    if (axisLocked.current !== 'h') return;

    // Rubber-band resistance on edges
    let clampedDx = dx;
    const atStart = currentIndex === 0;
    const atEnd = currentIndex === tabCount - 1;
    if (dx > 0 && atStart) clampedDx = Math.sign(dx) * Math.sqrt(Math.abs(dx)) * 5;
    if (dx < 0 && atEnd) clampedDx = Math.sign(dx) * Math.sqrt(Math.abs(dx)) * 5;

    latestDx.current = clampedDx;
    setDragX(clampedDx);
    if (!isDragging) setIsDragging(true);
  };

  const onTouchEnd = () => {
    const dx = latestDx.current;

    if (Math.abs(dx) >= threshold) {
      if (dx < 0 && currentIndex < tabCount - 1) onNavigate('next');
      else if (dx > 0 && currentIndex > 0) onNavigate('prev');
    }

    setDragX(0);
    setIsDragging(false);
    touchStart.current = null;
    axisLocked.current = null;
    latestDx.current = 0;
  };

  return {
    dragX,
    isDragging,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
};

export default useSwipeTabs;
