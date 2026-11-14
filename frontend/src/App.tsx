import React, { useState, useEffect } from 'react';
import { AppleRings } from './components/AppleRings';
import { SegmentedControl } from './components/SegmentedControl';
import { CycleDayPicker } from './components/CycleDayPicker';
import { MealCard, DishItem } from './components/MealCard';
import { TechCardModal } from './components/TechCardModal';
import { FreeModeConstructor } from './components/FreeModeConstructor';
import { AppleShortcutsModal } from './components/AppleShortcutsModal';
import { triggerHaptic } from './utils/applePhysics';
import {
  Utensils,
  Plus,
  Footprints,
  Flame,
  Scale,
  Zap,
  Calendar,
  Settings,
  Coffee,
  Sun,
  Sunset,
  Moon,
  Sparkles
} from 'lucide-react';
import axios from 'axios';

// Sample authentic dishes from техникум 14-day menu
const SAMPLE_CANTEEN_MENU: Record<string, DishItem[]> = {
  BREAKFAST: [
    {
      id: 101,
      dish_name: "Каша гречневая рассыпчатая с маслом",
      weight_raw: "200/5",
      weight_g: 205,
      card_number_raw: "171",
      tech_card_id: 171,
      calories: 285.0,
      protein: 8.4,
      fat: 6.8,
      carbs: 47.2,
      has_recipe_details: true
    },
    {
      id: 102,
      dish_name: "Пудинг из творога (запеченный) со сгущенкой",
      weight_raw: "250/40",
      weight_g: 290,
      card_number_raw: "66",
      tech_card_id: 66,
      calories: 341.5,
      protein: 18.2,
      fat: 12.4,
      carbs: 39.1,
      has_recipe_details: true
    },
    {
      id: 103,
      dish_name: "Чай с сахаром и лимоном",
      weight_raw: "200/15/7",
      weight_g: 222,
      card_number_raw: "258",
      tech_card_id: 258,
      calories: 60.0,
      protein: 0.2,
      fat: 0.0,
      carbs: 15.0
    }
  ],
  LUNCH: [
    {
      id: 104,
      dish_name: "Борщ с капустой и картофелем со сметаной",
      weight_raw: "250/10",
      weight_g: 260,
      card_number_raw: "42",
      tech_card_id: 42,
      calories: 165.0,
      protein: 4.8,
      fat: 8.5,
      carbs: 17.2,
      has_recipe_details: true
    },
    {
      id: 105,
      dish_name: "Котлеты рубленые из филе птицы с соусом",
      weight_raw: "100/50",
      weight_g: 150,
      card_number_raw: "214",
      tech_card_id: 214,
      calories: 275.0,
      protein: 23.5,
      fat: 14.2,
      carbs: 13.0,
      has_recipe_details: true
    },
    {
      id: 106,
      dish_name: "Макаронные изделия отварные с маслом",
      weight_raw: "180/5",
      weight_g: 185,
      card_number_raw: "178",
      tech_card_id: 178,
      calories: 260.0,
      protein: 7.2,
      fat: 5.6,
      carbs: 45.4
    }
  ],
  AFTERNOON_SNACK: [
    {
      id: 107,
      dish_name: "Булочка домашняя с повидлом",
      weight_raw: "100",
      weight_g: 100,
      card_number_raw: "310",
      tech_card_id: 310,
      calories: 290.0,
      protein: 6.1,
      fat: 4.5,
      carbs: 56.0
    },
    {
      id: 108,
      dish_name: "Сок яблочно-виноградный",
      weight_raw: "200",
      weight_g: 200,
      calories: 90.0,
      protein: 0.5,
      fat: 0.0,
      carbs: 22.0
    }
  ],
  DINNER: [
    {
      id: 109,
      dish_name: "Рыба запеченная с овощами под сыром",
      weight_raw: "120/80",
      weight_g: 200,
      card_number_raw: "192",
      tech_card_id: 192,
      calories: 240.0,
      protein: 24.0,
      fat: 9.8,
      carbs: 12.5,
      has_recipe_details: true
    },
    {
      id: 110,
      dish_name: "Пюре картофельное со сливочным маслом",
      weight_raw: "180",
      weight_g: 180,
      card_number_raw: "175",
      tech_card_id: 175,
      calories: 195.0,
      protein: 3.8,
      fat: 6.2,
      carbs: 31.0
    }
  ]
};

export const App: React.FC = () => {
  // Dietary Mode: DORMITORY (Общежитие) or FREE (Свободный)
  const [dietaryMode, setDietaryMode] = useState<string>('DORMITORY');

  // Cycle calculation ((targetDate - 2026-09-01) % 14) + 1
  const today = new Date();
  const cycleStartDate = new Date(2026, 8, 1);
  const diffDays = Math.floor((today.getTime() - cycleStartDate.getTime()) / (1000 * 3600 * 24));
  const defaultCycleDay = ((Math.max(0, diffDays)) % 14) + 1;

  const [selectedCycleDay, setSelectedCycleDay] = useState<number>(defaultCycleDay || 5);

  // Health Metrics synced via Apple Shortcuts Webhook
  const [healthMetrics, setHealthMetrics] = useState({
    steps: 8420,
    activeCalories: 430,
    weight: 74.2
  });

  // Food log state (dish IDs and multiplier)
  const [loggedDishes, setLoggedDishes] = useState<Map<number, number>>(new Map());
  const [customLogs, setCustomLogs] = useState<Array<{
    title: string;
    amount_g: number;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    meal_type: string;
  }>>([]);

  // Modals
  const [activeTechCardId, setActiveTechCardId] = useState<number | null>(null);
  const [isConstructorOpen, setIsConstructorOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Targets (Personalized for recomposition)
  const targets = {
    calories: 2200,
    protein: 155,
    fat: 65,
    carbs: 245
  };

  // Compute total consumed nutrients dynamically
  const calculateTotals = () => {
    let cal = 0;
    let prot = 0;
    let fat = 0;
    let carbs = 0;

    // Canteen logged dishes
    Object.values(SAMPLE_CANTEEN_MENU).flat().forEach((dish) => {
      if (loggedDishes.has(dish.id)) {
        const mult = loggedDishes.get(dish.id) || 1.0;
        cal += dish.calories * mult;
        prot += dish.protein * mult;
        fat += dish.fat * mult;
        carbs += dish.carbs * mult;
      }
    });

    // Custom logs
    customLogs.forEach((item) => {
      cal += item.calories;
      prot += item.protein;
      fat += item.fat;
      carbs += item.carbs;
    });

    return {
      calories: { current: Math.round(cal), target: targets.calories },
      protein: { current: Math.round(prot), target: targets.protein },
      fat: { current: Math.round(fat), target: targets.fat },
      carbs: { current: Math.round(carbs), target: targets.carbs }
    };
  };

  const totals = calculateTotals();

  // Toggle meal logging
  const handleToggleLog = (dish: DishItem, multiplier: number) => {
    setLoggedDishes((prev) => {
      const next = new Map(prev);
      if (next.has(dish.id) && next.get(dish.id) === multiplier) {
        next.delete(dish.id);
      } else {
        next.set(dish.id, multiplier);
      }
      return next;
    });
  };

  // Add custom food log from FreeModeConstructor
  const handleAddCustomLog = (entry: any) => {
    setCustomLogs((prev) => [...prev, entry]);
  };

  const mealIcons: Record<string, React.ReactNode> = {
    BREAKFAST: <Coffee className="w-4 h-4 text-apple-orange" />,
    LUNCH: <Sun className="w-4 h-4 text-apple-yellow" />,
    AFTERNOON_SNACK: <Sunset className="w-4 h-4 text-apple-teal" />,
    DINNER: <Moon className="w-4 h-4 text-apple-purple" />
  };

  const mealNames: Record<string, string> = {
    BREAKFAST: "Завтрак",
    LUNCH: "Обед",
    AFTERNOON_SNACK: "Полдник",
    DINNER: "Ужин"
  };

  return (
    <div className="min-h-full flex flex-col bg-[#F2F2F7] dark:bg-[#000000] text-[#1C1C1E] dark:text-[#F2F2F7] pb-28">
      {/* Apple Translucent Glass Navigation Bar with Safe Area Top */}
      <header className="sticky top-0 z-40 apple-glass-nav pt-safe transition-all duration-200">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-apple-blue/15 text-apple-blue flex items-center justify-center font-black text-sm">
              R
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-gray-1 block leading-none">
                Рекомпозиция
              </span>
              <h1 className="text-base font-bold tracking-tight text-[#1C1C1E] dark:text-white leading-tight">
                Дневник Питания
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setIsShortcutsOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-apple-blue/10 dark:bg-apple-blue/20 text-apple-blue text-xs font-semibold apple-pressable"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Apple Health</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pt-3 space-y-4">
        {/* Large Title Header (Apple iOS Style) */}
        <div className="px-1 pt-1 pb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-apple-gray-1">
            {today.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1C1C1E] dark:text-white -tracking-[0.025em]">
            Сводка дня
          </h2>
        </div>

        {/* Dietary Mode Switcher (Apple Physical Segmented Control) */}
        <SegmentedControl
          options={[
            { value: 'DORMITORY', label: 'Режим Общежитие', icon: <Utensils className="w-3.5 h-3.5" /> },
            { value: 'FREE', label: 'Свободный режим', icon: <Sparkles className="w-3.5 h-3.5" /> }
          ]}
          value={dietaryMode}
          onChange={(val) => {
            triggerHaptic('selection');
            setDietaryMode(val);
          }}
        />

        {/* Apple Health Activity Rings Card */}
        <AppleRings
          calories={totals.calories}
          protein={totals.protein}
          carbs={totals.carbs}
          fat={totals.fat}
        />

        {/* Apple Health & Activity Sync Metrics Ribbon */}
        <div className="apple-card p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-apple-orange/15 text-apple-orange flex items-center justify-center">
              <Footprints className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-apple-gray-1 font-medium block leading-none">Apple Шаги</span>
              <span className="text-sm font-bold text-[#1C1C1E] dark:text-white">
                {healthMetrics.steps.toLocaleString()} <span className="text-xs font-normal text-apple-gray-1">шагов</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-apple-red/15 text-apple-red flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-apple-gray-1 font-medium block leading-none">Активный расход</span>
              <span className="text-sm font-bold text-[#1C1C1E] dark:text-white">
                {healthMetrics.activeCalories} <span className="text-xs font-normal text-apple-gray-1">ккал</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-apple-teal/15 text-apple-teal flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-apple-gray-1 font-medium block leading-none">Вес тела</span>
              <span className="text-sm font-bold text-[#1C1C1E] dark:text-white">
                {healthMetrics.weight} <span className="text-xs font-normal text-apple-gray-1">кг</span>
              </span>
            </div>
          </div>
        </div>

        {/* View Mode 1: Dormitory (14-day cycle menu with tech cards) */}
        {dietaryMode === 'DORMITORY' && (
          <div className="space-y-4">
            {/* 14-day Horizontal Cycle Picker */}
            <CycleDayPicker
              currentCycleDay={defaultCycleDay}
              selectedDay={selectedCycleDay}
              onSelectDay={setSelectedCycleDay}
            />

            {/* Canteen Meals Accordion / Grouped Lists */}
            {Object.entries(SAMPLE_CANTEEN_MENU).map(([mealKey, dishes]) => (
              <div key={mealKey} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  {mealIcons[mealKey]}
                  <h4 className="text-xs font-bold uppercase tracking-wider text-apple-gray-1">
                    {mealNames[mealKey]}
                  </h4>
                </div>

                <div className="space-y-2">
                  {dishes.map((dish) => (
                    <MealCard
                      key={dish.id}
                      dish={dish}
                      isLogged={loggedDishes.has(dish.id)}
                      onToggleLog={handleToggleLog}
                      onOpenTechCard={setActiveTechCardId}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View Mode 2: Free Mode & Custom additions */}
        {dietaryMode === 'FREE' && (
          <div className="space-y-4">
            <div className="apple-card p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-apple-blue/15 text-apple-blue mx-auto flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1C1C1E] dark:text-white">
                  Свободный учет рациона
                </h3>
                <p className="text-xs text-apple-gray-1 max-w-sm mx-auto mt-1">
                  Составляйте рацион самостоятельно: поиск по 150+ базовым продуктам, штрихкод Open Food Facts и расчет рецептов.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setIsConstructorOpen(true);
                }}
                className="w-full py-3 bg-apple-blue text-white rounded-xl text-sm font-bold shadow-lg shadow-apple-blue/30 apple-pressable flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить продукт / рецепт</span>
              </button>
            </div>

            {/* Custom Logged Items List */}
            {customLogs.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-apple-gray-1 block px-1">
                  Добавленные блюда
                </span>
                <div className="space-y-2">
                  {customLogs.map((item, idx) => (
                    <div
                      key={idx}
                      className="apple-card p-3.5 flex items-center justify-between"
                    >
                      <div>
                        <h5 className="text-sm font-semibold text-[#1C1C1E] dark:text-white">{item.title}</h5>
                        <span className="text-xs text-apple-gray-1">{item.amount_g} г • {mealNames[item.meal_type] || item.meal_type}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-apple-red">{item.calories}</span>
                        <span className="text-[10px] text-apple-gray-1 ml-0.5">ккал</span>
                        <p className="text-[11px] text-apple-gray-1">Б: {item.protein}г • У: {item.carbs}г</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Apple Glass Bottom Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 apple-glass-bar pb-safe select-none">
        <div className="max-w-md mx-auto px-6 py-2 flex items-center justify-around">
          <button
            type="button"
            onClick={() => triggerHaptic('light')}
            className="flex flex-col items-center gap-1 text-apple-blue apple-pressable"
          >
            <Utensils className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Сегодня</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              setIsConstructorOpen(true);
            }}
            className="w-11 h-11 -mt-4 rounded-full bg-apple-blue text-white shadow-lg shadow-apple-blue/40 flex items-center justify-center apple-pressable"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setIsShortcutsOpen(true);
            }}
            className="flex flex-col items-center gap-1 text-apple-gray-1 hover:text-[#1C1C1E] dark:hover:text-white apple-pressable"
          >
            <Zap className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Apple Health</span>
          </button>
        </div>
      </nav>

      {/* Modals & Bottom Sheets */}
      <TechCardModal
        cardId={activeTechCardId}
        isOpen={Boolean(activeTechCardId)}
        onClose={() => setActiveTechCardId(null)}
      />

      <FreeModeConstructor
        isOpen={isConstructorOpen}
        onClose={() => setIsConstructorOpen(false)}
        onAddLog={handleAddCustomLog}
      />

      <AppleShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        onSyncSuccess={(metrics) => {
          setHealthMetrics((prev) => ({
            ...prev,
            steps: metrics.steps,
            activeCalories: metrics.calories,
            weight: metrics.weight || prev.weight
          }));
        }}
      />
    </div>
  );
};
