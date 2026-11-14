import React, { useRef, useEffect, useState } from 'react';
import { triggerHaptic } from '../utils/applePhysics';

interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  className = ""
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const activeIndex = options.findIndex(o => o.value === value);

  useEffect(() => {
    if (!containerRef.current) return;
    const buttons = containerRef.current.querySelectorAll<HTMLButtonElement>('button[data-segment]');
    const activeBtn = buttons[activeIndex];
    if (activeBtn) {
      setIndicatorStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
      });
    }
  }, [activeIndex, options]);

  const handleSelect = (val: string) => {
    if (val !== value) {
      triggerHaptic('selection');
      onChange(val);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center p-1 bg-[#767680]/12 dark:bg-[#767680]/24 rounded-[12px] select-none ${className}`}
    >
      {/* Apple Physical Spring Thumb Slider */}
      <div
        className="absolute top-1 bottom-1 rounded-[9px] bg-white dark:bg-[#636366] shadow-[0_3px_8px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)] dark:shadow-[0_3px_8px_rgba(0,0,0,0.3)] pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
        style={{
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
        }}
      />

      {/* Buttons */}
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            data-segment
            type="button"
            onClick={() => handleSelect(option.value)}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-[13px] font-semibold transition-colors duration-200 apple-pressable-subtle ${
              isActive
                ? 'text-[#1C1C1E] dark:text-white'
                : 'text-apple-gray-1 hover:text-[#1C1C1E] dark:hover:text-white'
            }`}
          >
            {option.icon && <span className="w-3.5 h-3.5">{option.icon}</span>}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};
