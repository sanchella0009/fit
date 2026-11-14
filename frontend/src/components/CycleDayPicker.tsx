import React from 'react';
import { triggerHaptic } from '../utils/applePhysics';
import { Sparkles } from 'lucide-react';

interface CycleDayPickerProps {
  currentCycleDay: number; // calculated from cycle formula
  selectedDay: number;
  onSelectDay: (day: number) => void;
}

export const CycleDayPicker: React.FC<CycleDayPickerProps> = ({
  currentCycleDay,
  selectedDay,
  onSelectDay
}) => {
  const days = Array.from({ length: 14 }, (_, i) => i + 1);

  const handleSelect = (day: number) => {
    if (day !== selectedDay) {
      triggerHaptic('selection');
      onSelectDay(day);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-apple-gray-1">
          14-дневный цикл столовой
        </span>
        <div className="flex items-center gap-1 text-[11px] font-medium text-apple-blue bg-apple-blue/10 dark:bg-apple-blue/20 px-2 py-0.5 rounded-full">
          <Sparkles className="w-3 h-3" />
          <span>Сегодня: День {currentCycleDay}</span>
        </div>
      </div>

      {/* Horizontal Apple Scroll Track */}
      <div className="flex gap-2 overflow-x-auto pb-2 pt-1 px-1 no-scrollbar select-none overscroll-contain">
        {days.map((day) => {
          const isSelected = day === selectedDay;
          const isCurrentToday = day === currentCycleDay;

          return (
            <button
              key={day}
              type="button"
              onClick={() => handleSelect(day)}
              className={`flex-shrink-0 flex flex-col items-center justify-center w-12 h-16 rounded-[16px] transition-all duration-200 apple-pressable ${
                isSelected
                  ? 'bg-apple-blue text-white shadow-[0_4px_12px_rgba(0,122,255,0.35)] scale-[1.03]'
                  : 'bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-white border border-black/[0.06] dark:border-white/[0.08]'
              }`}
            >
              <span className={`text-[10px] font-semibold uppercase tracking-tight ${isSelected ? 'text-white/80' : 'text-apple-gray-1'}`}>
                День
              </span>
              <span className="text-lg font-black tracking-tight leading-tight mt-0.5">
                {day}
              </span>
              {isCurrentToday && (
                <div
                  className={`w-1.5 h-1.5 rounded-full mt-1 ${
                    isSelected ? 'bg-white' : 'bg-apple-blue'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
