import React from 'react';
import { triggerHaptic } from '../utils/applePhysics';
import { Flame, Beef, Wheat, Droplets } from 'lucide-react';

interface AppleRingsProps {
  calories: { current: number; target: number };
  protein: { current: number; target: number };
  carbs: { current: number; target: number };
  fat: { current: number; target: number };
}

export const AppleRings: React.FC<AppleRingsProps> = ({
  calories,
  protein,
  carbs,
  fat
}) => {
  // Percentages clamped or overflowing for multi-rings
  const calPct = Math.min(calories.target > 0 ? (calories.current / calories.target) * 100 : 0, 100);
  const protPct = Math.min(protein.target > 0 ? (protein.current / protein.target) * 100 : 0, 100);
  const carbsPct = Math.min(carbs.target > 0 ? (carbs.current / carbs.target) * 100 : 0, 100);

  // Radii and stroke geometry for 3 concentric rings (Apple Fitness style)
  // Outer: Calories (Red/Coral), Middle: Protein (Bright Green), Inner: Carbs (Cyan/Teal)
  const size = 180;
  const strokeWidth = 14;
  const gap = 3;

  const rOuter = (size / 2) - strokeWidth / 2 - 4; // ~77
  const rMiddle = rOuter - strokeWidth - gap;      // ~60
  const rInner = rMiddle - strokeWidth - gap;      // ~43

  const circOuter = 2 * Math.PI * rOuter;
  const circMiddle = 2 * Math.PI * rMiddle;
  const circInner = 2 * Math.PI * rInner;

  const offsetOuter = circOuter - (calPct / 100) * circOuter;
  const offsetMiddle = circMiddle - (protPct / 100) * circMiddle;
  const offsetInner = circInner - (carbsPct / 100) * circInner;

  return (
    <div 
      className="apple-card p-5 transition-transform duration-300"
      onClick={() => triggerHaptic('light')}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-apple-gray-1">Кольца активности</span>
          <h3 className="text-xl font-bold tracking-tight text-[#1C1C1E] dark:text-white flex items-center gap-1.5">
            Суточный прогресс
          </h3>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black tracking-tight text-apple-red">
            {Math.round(calories.current)}
          </span>
          <span className="text-xs text-apple-gray-1 font-medium ml-1">/ {calories.target} ккал</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
        {/* Apple Fitness Activity Ring Graphic */}
        <div className="relative w-[180px] h-[180px] flex items-center justify-center flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
            <defs>
              {/* Outer Ring Gradient: Red -> Coral */}
              <linearGradient id="appleRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FA114F" />
                <stop offset="100%" stopColor="#FF5252" />
              </linearGradient>
              {/* Middle Ring Gradient: Lime -> Green */}
              <linearGradient id="appleGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#A1FF00" />
                <stop offset="100%" stopColor="#00E676" />
              </linearGradient>
              {/* Inner Ring Gradient: Cyan -> Teal */}
              <linearGradient id="appleTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00F5D4" />
                <stop offset="100%" stopColor="#00B4D8" />
              </linearGradient>
            </defs>

            {/* Background Tracks */}
            <circle
              cx={size / 2} cy={size / 2} r={rOuter}
              stroke="rgba(250, 17, 79, 0.18)"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            <circle
              cx={size / 2} cy={size / 2} r={rMiddle}
              stroke="rgba(161, 255, 0, 0.18)"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            <circle
              cx={size / 2} cy={size / 2} r={rInner}
              stroke="rgba(0, 245, 212, 0.18)"
              strokeWidth={strokeWidth}
              fill="transparent"
            />

            {/* Animated Progress Rings with Apple Round Caps */}
            <circle
              cx={size / 2} cy={size / 2} r={rOuter}
              stroke="url(#appleRedGrad)"
              strokeWidth={strokeWidth}
              strokeDasharray={circOuter}
              strokeDashoffset={offsetOuter}
              strokeLinecap="round"
              fill="transparent"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.25, 1, 0.5, 1)' }}
            />
            <circle
              cx={size / 2} cy={size / 2} r={rMiddle}
              stroke="url(#appleGreenGrad)"
              strokeWidth={strokeWidth}
              strokeDasharray={circMiddle}
              strokeDashoffset={offsetMiddle}
              strokeLinecap="round"
              fill="transparent"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.25, 1, 0.5, 1)' }}
            />
            <circle
              cx={size / 2} cy={size / 2} r={rInner}
              stroke="url(#appleTealGrad)"
              strokeWidth={strokeWidth}
              strokeDasharray={circInner}
              strokeDashoffset={offsetInner}
              strokeLinecap="round"
              fill="transparent"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.25, 1, 0.5, 1)' }}
            />
          </svg>

          {/* Center Activity Indicator Icon */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <Flame className="w-7 h-7 text-apple-red animate-pulse" />
            <span className="text-[11px] font-bold tracking-tight text-apple-gray-1 mt-0.5">
              {Math.round(calPct)}%
            </span>
          </div>
        </div>

        {/* Apple Health Metric Chips */}
        <div className="grid grid-cols-1 gap-2.5 w-full sm:max-w-[210px]">
          {/* Protein */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-apple-gray-6 dark:bg-[#2C2C2E]/60 border border-black/[0.04] dark:border-white/[0.04]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#A1FF00]/20 flex items-center justify-center text-[#388E3C] dark:text-[#A1FF00]">
                <Beef className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-[#1C1C1E] dark:text-gray-200">Белки</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                {Math.round(protein.current)} <span className="text-[10px] text-apple-gray-1 font-normal">/ {protein.target}г</span>
              </span>
            </div>
          </div>

          {/* Fats */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-apple-gray-6 dark:bg-[#2C2C2E]/60 border border-black/[0.04] dark:border-white/[0.04]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-apple-orange/20 flex items-center justify-center text-apple-orange">
                <Droplets className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-[#1C1C1E] dark:text-gray-200">Жиры</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                {Math.round(fat.current)} <span className="text-[10px] text-apple-gray-1 font-normal">/ {fat.target}г</span>
              </span>
            </div>
          </div>

          {/* Carbs */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-apple-gray-6 dark:bg-[#2C2C2E]/60 border border-black/[0.04] dark:border-white/[0.04]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-apple-teal/20 flex items-center justify-center text-apple-teal">
                <Wheat className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-[#1C1C1E] dark:text-gray-200">Углеводы</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                {Math.round(carbs.current)} <span className="text-[10px] text-apple-gray-1 font-normal">/ {carbs.target}г</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
