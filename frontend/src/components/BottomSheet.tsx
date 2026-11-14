import React, { useRef, useState, useEffect } from 'react';
import { rubberband, project, triggerHaptic } from '../utils/applePhysics';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Velocity tracking
  const dragStartY = useRef(0);
  const lastMoveY = useRef(0);
  const lastTime = useRef(0);
  const velocityY = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setTranslateY(0);
      triggerHaptic('light');
      // Lock body scroll
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    // Only drag from header or handle, or top 60px of the sheet
    if (!target.closest('[data-drag-handle]')) return;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStartY.current = e.clientY - translateY;
    lastMoveY.current = e.clientY;
    lastTime.current = performance.now();
    velocityY.current = 0;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const currentY = e.clientY;
    const now = performance.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      velocityY.current = (currentY - lastMoveY.current) / (dt / 1000); // px/s
    }
    lastMoveY.current = currentY;
    lastTime.current = now;

    let delta = currentY - dragStartY.current;

    // Apple rubber-banding if dragging upwards past resting 0
    if (delta < 0) {
      delta = -rubberband(Math.abs(delta), 400, 0.55);
    }

    setTranslateY(delta);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

    const projectedEndpoint = translateY + project(velocityY.current, 0.998);

    // If dismissed downwards by distance (> 120px) or flicked downwards with speed (> 400px/s)
    if (translateY > 120 || velocityY.current > 400 || projectedEndpoint > 250) {
      triggerHaptic('medium');
      onClose();
    } else {
      // Spring back to resting point (0)
      setTranslateY(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Apple Dimming Scrim with Blur */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[4px] transition-opacity duration-300"
        onClick={() => {
          triggerHaptic('light');
          onClose();
        }}
      />

      {/* Physical Apple Sheet */}
      <div
        ref={sheetRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform: `translateY(${Math.max(translateY, -60)}px)`,
          transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)'
        }}
        className="relative z-10 w-full max-h-[92dvh] bg-white dark:bg-[#1C1C1E] rounded-t-[28px] shadow-apple-sheet flex flex-col pb-safe border-t border-black/[0.08] dark:border-white/[0.12] overflow-hidden"
      >
        {/* Apple Sheet Header & Grab Handle */}
        <div data-drag-handle className="pt-2.5 pb-2 px-5 cursor-grab active:cursor-grabbing select-none flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-apple-gray-3 dark:bg-[#48484A] mx-auto mb-3" />
          
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h3 className="text-lg font-bold tracking-tight text-[#1C1C1E] dark:text-white">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-apple-gray-1 font-medium mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="w-7 h-7 rounded-full bg-apple-gray-6 dark:bg-[#2C2C2E] flex items-center justify-center text-apple-gray-1 hover:text-black dark:hover:text-white apple-pressable"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content (Isolated with overscroll-contain) */}
        <div className="flex-1 overflow-y-auto px-5 py-3 overscroll-contain no-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
