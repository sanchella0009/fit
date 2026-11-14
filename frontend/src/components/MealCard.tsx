import React, { useState } from 'react';
import { triggerHaptic } from '../utils/applePhysics';
import { Check, FileText, ChevronRight } from 'lucide-react';

export interface DishItem {
  id: number;
  dish_name: string;
  weight_raw?: string;
  weight_g: number;
  card_number_raw?: string;
  tech_card_id?: number | null;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  has_recipe_details?: boolean;
}

interface MealCardProps {
  dish: DishItem;
  isLogged?: boolean;
  onToggleLog: (dish: DishItem, multiplier: number) => void;
  onOpenTechCard?: (techCardId: number) => void;
}

export const MealCard: React.FC<MealCardProps> = ({
  dish,
  isLogged = false,
  onToggleLog,
  onOpenTechCard
}) => {
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const multipliers = [0.5, 1.0, 1.5, 2.0];

  const handleMultiplierChange = (mult: number, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('selection');
    setMultiplier(mult);
    if (isLogged) {
      onToggleLog(dish, mult);
    }
  };

  const handleToggle = () => {
    triggerHaptic('medium');
    onToggleLog(dish, multiplier);
  };

  const scaledCalories = Math.round(dish.calories * multiplier);
  const scaledProtein = (dish.protein * multiplier).toFixed(1);
  const scaledFat = (dish.fat * multiplier).toFixed(1);
  const scaledCarbs = (dish.carbs * multiplier).toFixed(1);
  const scaledWeight = Math.round(dish.weight_g * multiplier);

  return (
    <div
      onClick={handleToggle}
      className={`apple-card p-4 transition-all duration-200 select-none cursor-pointer apple-pressable-subtle relative overflow-hidden ${
        isLogged
          ? 'border-apple-green/40 bg-apple-green/[0.04] dark:bg-apple-green/[0.07]'
          : 'hover:border-black/10 dark:hover:border-white/10'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left Side: Checkbox + Dish Title */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Apple Circular Checkbox with instant spring */}
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200 ${
              isLogged
                ? 'bg-apple-green text-white shadow-[0_2px_8px_rgba(52,199,89,0.4)] scale-105'
                : 'border-2 border-apple-gray-3 dark:border-[#48484A] bg-transparent'
            }`}
          >
            {isLogged && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className={`text-[15px] font-semibold leading-snug tracking-tight truncate ${
              isLogged ? 'line-through text-apple-gray-1' : 'text-[#1C1C1E] dark:text-white'
            }`}>
              {dish.dish_name}
            </h4>

            {/* Subtitle / Tech Card pill */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-apple-gray-1 font-medium">
                {dish.weight_raw || `${scaledWeight}г`}
              </span>

              {dish.tech_card_id && onOpenTechCard && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('light');
                    onOpenTechCard(dish.tech_card_id!);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-apple-blue bg-apple-blue/10 dark:bg-apple-blue/20 hover:bg-apple-blue/20 px-2 py-0.5 rounded-full transition-colors apple-pressable"
                >
                  <FileText className="w-3 h-3" />
                  <span>ТК #{dish.card_number_raw || dish.tech_card_id}</span>
                  <ChevronRight className="w-2.5 h-2.5 opacity-60" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Total Kcal */}
        <div className="text-right flex-shrink-0">
          <span className="text-[17px] font-bold text-[#1C1C1E] dark:text-white tracking-tight">
            {scaledCalories}
          </span>
          <span className="text-[10px] text-apple-gray-1 font-medium ml-0.5">ккал</span>
        </div>
      </div>

      {/* Footer: Macros and Portion Multiplier Segmented Pills */}
      <div className="mt-3 pt-2.5 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
        {/* Macros Breakdown */}
        <div className="flex items-center gap-2.5 text-[11px] font-medium text-apple-gray-1">
          <span>Б: <b className="text-[#1C1C1E] dark:text-gray-200">{scaledProtein}</b></span>
          <span>Ж: <b className="text-[#1C1C1E] dark:text-gray-200">{scaledFat}</b></span>
          <span>У: <b className="text-[#1C1C1E] dark:text-gray-200">{scaledCarbs}</b></span>
        </div>

        {/* Portion Multiplier (0.5x, 1x, 1.5x, 2x) */}
        <div
          className="flex items-center p-0.5 bg-apple-gray-6 dark:bg-[#2C2C2E] rounded-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {multipliers.map((mult) => {
            const isSelected = multiplier === mult;
            return (
              <button
                key={mult}
                type="button"
                onClick={(e) => handleMultiplierChange(mult, e)}
                className={`px-1.5 py-0.5 text-[11px] font-semibold rounded-md transition-all duration-150 apple-pressable-subtle ${
                  isSelected
                    ? 'bg-white dark:bg-[#636366] text-[#1C1C1E] dark:text-white shadow-sm'
                    : 'text-apple-gray-1 hover:text-black dark:hover:text-white'
                }`}
              >
                {mult}x
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
