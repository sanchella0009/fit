import React, { useState, useEffect } from 'react';
import { AppleRings } from './components/AppleRings';
import { SegmentedControl } from './components/SegmentedControl';
import { CycleDayPicker } from './components/CycleDayPicker';
import { MealCard, DishItem } from './components/MealCard';
import { TechCardModal } from './components/TechCardModal';
import { FreeModeConstructor } from './components/FreeModeConstructor';
import { AppleShortcutsModal } from './components/AppleShortcutsModal';
import { AuthModal } from './components/AuthModal';
import { WorkoutsView } from './components/WorkoutsView';
import { CustomMenuBuilderModal } from './components/CustomMenuBuilderModal';
import { triggerHaptic } from './utils/applePhysics';
import { UserProfile } from './types/auth';
import {
  Utensils,
  Plus,
  Footprints,
  Flame,
  Scale,
  Zap,
  Coffee,
  Sun,
  Sunset,
  Moon,
  Sparkles,
  Dumbbell,
  User,
  ShieldCheck,
  LogOut,
  Upload,
  Lock,
  Layers,
  UtensilsCrossed
} from 'lucide-react';
import axios from 'axios';

// Default authentic техникум dishes for GorokhovA
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

const DEFAULT_GOROKHOVA: UserProfile = {
  id: 1,
  username: "GorokhovA",
  email: "gorokhova@sanchella.ru",
  role: "ADMIN",
  dietary_mode: "DORMITORY",
  webhook_token: "wh_gorokhova_sec_2026_recomp_fit",
  target_calories: 2400,
  target_protein_g: 165,
  target_fat_g: 70,
  target_carbs_g: 275,
  is_admin: true,
  has_dorm_menu_access: true
};

export const App: React.FC = () => {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<'NUTRITION' | 'WORKOUTS' | 'HEALTH' | 'PROFILE'>('NUTRITION');

  // Active User session (persisted in localStorage)
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('recomp_user');
    return saved ? JSON.parse(saved) : DEFAULT_GOROKHOVA;
  });

  // Dietary Mode
  const [dietaryMode, setDietaryMode] = useState<string>(currentUser.dietary_mode || 'DORMITORY');

  // Cycle day
  const today = new Date();
  const cycleStartDate = new Date(2026, 8, 1);
  const diffDays = Math.floor((today.getTime() - cycleStartDate.getTime()) / (1000 * 3600 * 24));
  const defaultCycleDay = ((Math.max(0, diffDays)) % 14) + 1;
  const [selectedCycleDay, setSelectedCycleDay] = useState<number>(defaultCycleDay || 5);

  // Health Metrics
  const [healthMetrics, setHealthMetrics] = useState({
    steps: 8420,
    activeCalories: 430,
    weight: 74.2
  });

  // Food logging
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

  // User-created custom cycle dishes for other users
  const [userCustomMenu, setUserCustomMenu] = useState<Record<number, DishItem[]>>({});

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [activeTechCardId, setActiveTechCardId] = useState<number | null>(null);
  const [isConstructorOpen, setIsConstructorOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isCustomMenuOpen, setIsCustomMenuOpen] = useState(false);

  // Check if current user is GorokhovA or ADMIN
  const isGorokhovA = currentUser.username.toLowerCase() === 'gorokhova' || currentUser.is_admin;

  const handleAuthSuccess = (user: UserProfile, token: string) => {
    setCurrentUser(user);
    setDietaryMode(user.dietary_mode);
    localStorage.setItem('recomp_user', JSON.stringify(user));
    localStorage.setItem('recomp_token', token);
  };

  const handleLogout = () => {
    triggerHaptic('medium');
    localStorage.removeItem('recomp_user');
    localStorage.removeItem('recomp_token');
    setCurrentUser({
      id: 2,
      username: "Guest",
      email: "guest@recomp.local",
      role: "USER",
      dietary_mode: "FREE",
      webhook_token: "guest_wh_token",
      target_calories: 2200,
      target_protein_g: 150,
      target_fat_g: 70,
      target_carbs_g: 240,
      is_admin: false,
      has_dorm_menu_access: false
    });
    setDietaryMode('FREE');
  };

  // Nutrients total
  const calculateTotals = () => {
    let cal = 0;
    let prot = 0;
    let fat = 0;
    let carbs = 0;

    Object.values(SAMPLE_CANTEEN_MENU).flat().forEach((dish) => {
      if (loggedDishes.has(dish.id)) {
        const mult = loggedDishes.get(dish.id) || 1.0;
        cal += dish.calories * mult;
        prot += dish.protein * mult;
        fat += dish.fat * mult;
        carbs += dish.carbs * mult;
      }
    });

    customLogs.forEach((item) => {
      cal += item.calories;
      prot += item.protein;
      fat += item.fat;
      carbs += item.carbs;
    });

    return {
      calories: { current: Math.round(cal), target: currentUser.target_calories },
      protein: { current: Math.round(prot), target: currentUser.target_protein_g },
      fat: { current: Math.round(fat), target: currentUser.target_fat_g },
      carbs: { current: Math.round(carbs), target: currentUser.target_carbs_g }
    };
  };

  const totals = calculateTotals();

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

  const handleAddCustomLog = (entry: any) => {
    setCustomLogs((prev) => [...prev, entry]);
  };

  const handleAddCustomMenuDish = (dish: any) => {
    const day = dish.day_number || 1;
    setUserCustomMenu(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), dish]
    }));
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
      {/* Apple Translucent Navigation Bar */}
      <header className="sticky top-0 z-40 apple-glass-nav pt-safe transition-all duration-200">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-apple-blue/15 text-apple-blue flex items-center justify-center font-black text-sm">
              {currentUser.username[0]?.toUpperCase() || 'R'}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-gray-1 leading-none">
                  {currentUser.role === 'ADMIN' ? 'Администратор' : 'Спортсмен'}
                </span>
                {isGorokhovA && <ShieldCheck className="w-3 h-3 text-apple-blue" />}
              </div>
              <h1 className="text-base font-bold tracking-tight text-[#1C1C1E] dark:text-white leading-tight">
                {currentUser.username}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsAuthOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.1] text-xs font-semibold apple-pressable"
            >
              <User className="w-3.5 h-3.5 text-apple-gray-1" />
              <span>{currentUser.username === 'Guest' ? 'Вход' : 'Аккаунт'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pt-3 space-y-4">
        {/* TAB 1: NUTRITION */}
        {activeTab === 'NUTRITION' && (
          <div className="space-y-4">
            {/* Large Title */}
            <div className="px-1 pt-1 pb-1 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-apple-gray-1">
                  {today.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
                <h2 className="text-3xl font-extrabold tracking-tight text-[#1C1C1E] dark:text-white -tracking-[0.025em]">
                  Дневник питания
                </h2>
              </div>
            </div>

            {/* Mode Switcher */}
            <SegmentedControl
              options={[
                { value: 'DORMITORY', label: isGorokhovA ? 'Меню Общаги' : 'Циклическое меню', icon: <Utensils className="w-3.5 h-3.5" /> },
                { value: 'FREE', label: 'Свободный режим', icon: <Sparkles className="w-3.5 h-3.5" /> }
              ]}
              value={dietaryMode}
              onChange={(val) => {
                triggerHaptic('selection');
                setDietaryMode(val);
              }}
            />

            {/* Apple Activity Rings */}
            <AppleRings
              calories={totals.calories}
              protein={totals.protein}
              carbs={totals.carbs}
              fat={totals.fat}
            />

            {/* Activity Sync Ribbon */}
            <div className="apple-card p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-apple-orange/15 text-apple-orange flex items-center justify-center">
                  <Footprints className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-apple-gray-1 font-medium block leading-none">Apple Шаги</span>
                  <span className="text-sm font-bold text-[#1C1C1E] dark:text-white">
                    {healthMetrics.steps.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-apple-red/15 text-apple-red flex items-center justify-center">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-apple-gray-1 font-medium block leading-none">Расход</span>
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

            {/* DORMITORY MODE CONTENT */}
            {dietaryMode === 'DORMITORY' && (
              <div className="space-y-4">
                {isGorokhovA ? (
                  <>
                    <CycleDayPicker
                      currentCycleDay={defaultCycleDay}
                      selectedDay={selectedCycleDay}
                      onSelectDay={setSelectedCycleDay}
                    />

                    {/* Canteen Meals Accordion */}
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
                  </>
                ) : (
                  /* Custom Menu for other users */
                  <div className="space-y-4">
                    <div className="apple-card p-5 space-y-3 border-2 border-apple-blue/20">
                      <div className="w-12 h-12 rounded-full bg-apple-blue/15 text-apple-blue mx-auto flex items-center justify-center">
                        <UtensilsCrossed className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <h4 className="text-base font-bold text-[#1C1C1E] dark:text-white">
                          Ваше личное циклическое меню
                        </h4>
                        <p className="text-xs text-apple-gray-1 max-w-sm mx-auto mt-1">
                          Меню общежития техникума закреплено за GorokhovA. Вы можете составить свое собственное 14-дневное расписание или загрузить файл меню столовой (.docx).
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('medium');
                            setIsCustomMenuOpen(true);
                          }}
                          className="flex-1 py-2.5 bg-apple-blue text-white rounded-xl text-xs font-bold shadow-md apple-pressable flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Составить / Загрузить .docx</span>
                        </button>
                      </div>
                    </div>

                    {/* Show user custom dishes if added */}
                    {userCustomMenu[selectedCycleDay] && userCustomMenu[selectedCycleDay].length > 0 ? (
                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-apple-gray-1 px-1">
                          Блюда Дня {selectedCycleDay}
                        </span>
                        {userCustomMenu[selectedCycleDay].map((d) => (
                          <MealCard
                            key={d.id}
                            dish={d}
                            isLogged={loggedDishes.has(d.id)}
                            onToggleLog={handleToggleLog}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-xs text-apple-gray-1">
                        Пока нет добавленных блюд на этот день цикла.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* FREE MODE CONTENT */}
            {dietaryMode === 'FREE' && (
              <div className="space-y-4">
                <div className="apple-card p-5 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-apple-blue/15 text-apple-blue mx-auto flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1C1C1E] dark:text-white">
                      Свободный рацион
                    </h3>
                    <p className="text-xs text-apple-gray-1 max-w-sm mx-auto mt-1">
                      Учет по граммовкам: 150+ базовых продуктов, камера со сканером штрихкодов Open Food Facts и рецепты.
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

                {customLogs.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-apple-gray-1 px-1 block">
                      Добавленные блюда за сегодня
                    </span>
                    <div className="space-y-2">
                      {customLogs.map((item, idx) => (
                        <div key={idx} className="apple-card p-3.5 flex items-center justify-between">
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
          </div>
        )}

        {/* TAB 2: WORKOUTS (ТРЕНИРОВКИ) */}
        {activeTab === 'WORKOUTS' && (
          <WorkoutsView
            userId={currentUser.id}
            onWorkoutComplete={(cal) => {
              setHealthMetrics(prev => ({
                ...prev,
                activeCalories: prev.activeCalories + cal
              }));
            }}
          />
        )}

        {/* TAB 3: APPLE HEALTH */}
        {activeTab === 'HEALTH' && (
          <div className="space-y-4">
            <div className="px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-apple-gray-1">
                Интеграция с устройствами
              </span>
              <h2 className="text-2xl font-extrabold tracking-tight text-[#1C1C1E] dark:text-white">
                Apple Health & Shortcuts
              </h2>
            </div>

            <div className="apple-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-apple-orange/15 text-apple-orange flex items-center justify-center">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#1C1C1E] dark:text-white">
                    Синхронизация здоровья
                  </h4>
                  <p className="text-xs text-apple-gray-1">
                    Автоматическая выгрузка шагов и калорий с Apple Watch
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-apple-gray-6 dark:bg-[#2C2C2E]">
                  <span className="text-[11px] text-apple-gray-1 font-medium">Шагов за сегодня</span>
                  <p className="text-xl font-black text-[#1C1C1E] dark:text-white mt-1">
                    {healthMetrics.steps.toLocaleString()}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-apple-gray-6 dark:bg-[#2C2C2E]">
                  <span className="text-[11px] text-apple-gray-1 font-medium">Активных ккал</span>
                  <p className="text-xl font-black text-apple-red mt-1">
                    {healthMetrics.activeCalories}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setIsShortcutsOpen(true);
                }}
                className="w-full py-3 bg-apple-blue text-white rounded-xl text-xs font-bold shadow-md apple-pressable flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>Настроить быструю команду iOS</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: PROFILE */}
        {activeTab === 'PROFILE' && (
          <div className="space-y-4">
            <div className="px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-apple-gray-1">
                Личный кабинет
              </span>
              <h2 className="text-2xl font-extrabold tracking-tight text-[#1C1C1E] dark:text-white">
                Профиль рекомпозиции
              </h2>
            </div>

            <div className="apple-card p-5 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
                <div className="w-14 h-14 rounded-full bg-apple-blue/15 text-apple-blue font-black text-xl flex items-center justify-center">
                  {currentUser.username[0]?.toUpperCase()}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-[#1C1C1E] dark:text-white flex items-center gap-1.5">
                    <span>{currentUser.username}</span>
                    {isGorokhovA && <ShieldCheck className="w-4 h-4 text-apple-blue" />}
                  </h4>
                  <span className="text-xs text-apple-gray-1">{currentUser.email}</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-apple-blue/10 text-apple-blue">
                      {currentUser.role}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-apple-green/10 text-apple-green">
                      {dietaryMode === 'DORMITORY' ? 'Общежитие' : 'Свободный режим'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Targets */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-apple-gray-1 uppercase tracking-wider block">
                  Суточные цели КБЖУ
                </span>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-apple-gray-6 dark:bg-[#2C2C2E]">
                    <span className="text-[10px] text-apple-gray-1 block">Ккал</span>
                    <b className="text-sm font-bold text-apple-red">{currentUser.target_calories}</b>
                  </div>
                  <div className="p-2.5 rounded-xl bg-apple-gray-6 dark:bg-[#2C2C2E]">
                    <span className="text-[10px] text-apple-gray-1 block">Белки</span>
                    <b className="text-sm font-bold text-[#1C1C1E] dark:text-white">{currentUser.target_protein_g}г</b>
                  </div>
                  <div className="p-2.5 rounded-xl bg-apple-gray-6 dark:bg-[#2C2C2E]">
                    <span className="text-[10px] text-apple-gray-1 block">Жиры</span>
                    <b className="text-sm font-bold text-apple-orange">{currentUser.target_fat_g}г</b>
                  </div>
                  <div className="p-2.5 rounded-xl bg-apple-gray-6 dark:bg-[#2C2C2E]">
                    <span className="text-[10px] text-apple-gray-1 block">Углев</span>
                    <b className="text-sm font-bold text-apple-teal">{currentUser.target_carbs_g}г</b>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(true)}
                  className="w-full py-2.5 bg-apple-blue/10 dark:bg-apple-blue/20 text-apple-blue rounded-xl text-xs font-bold apple-pressable"
                >
                  Сменить аккаунт / Регистрация
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2.5 bg-apple-red/10 text-apple-red rounded-xl text-xs font-bold apple-pressable flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Выйти из аккаунта</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Apple Glass Bottom Bar (4 Tabs) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 apple-glass-bar pb-safe select-none">
        <div className="max-w-md mx-auto px-6 py-2 flex items-center justify-between">
          {/* Tab 1: Nutrition */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('NUTRITION');
            }}
            className={`flex flex-col items-center gap-1 apple-pressable ${
              activeTab === 'NUTRITION' ? 'text-apple-blue font-bold' : 'text-apple-gray-1'
            }`}
          >
            <Utensils className="w-5 h-5" />
            <span className="text-[10px]">Питание</span>
          </button>

          {/* Tab 2: Workouts */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('WORKOUTS');
            }}
            className={`flex flex-col items-center gap-1 apple-pressable ${
              activeTab === 'WORKOUTS' ? 'text-apple-blue font-bold' : 'text-apple-gray-1'
            }`}
          >
            <Dumbbell className="w-5 h-5" />
            <span className="text-[10px]">Тренировки</span>
          </button>

          {/* Center Quick Add Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              if (dietaryMode === 'FREE') {
                setIsConstructorOpen(true);
              } else if (!isGorokhovA) {
                setIsCustomMenuOpen(true);
              } else {
                setIsConstructorOpen(true);
              }
            }}
            className="w-11 h-11 -mt-4 rounded-full bg-apple-blue text-white shadow-lg shadow-apple-blue/40 flex items-center justify-center apple-pressable"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>

          {/* Tab 3: Health */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('HEALTH');
            }}
            className={`flex flex-col items-center gap-1 apple-pressable ${
              activeTab === 'HEALTH' ? 'text-apple-blue font-bold' : 'text-apple-gray-1'
            }`}
          >
            <Zap className="w-5 h-5" />
            <span className="text-[10px]">Apple Health</span>
          </button>

          {/* Tab 4: Profile */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('PROFILE');
            }}
            className={`flex flex-col items-center gap-1 apple-pressable ${
              activeTab === 'PROFILE' ? 'text-apple-blue font-bold' : 'text-apple-gray-1'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px]">Профиль</span>
          </button>
        </div>
      </nav>

      {/* Modals & Bottom Sheets */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

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

      <CustomMenuBuilderModal
        isOpen={isCustomMenuOpen}
        onClose={() => setIsCustomMenuOpen(false)}
        onDishAdded={handleAddCustomMenuDish}
      />

      <AppleShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        webhookToken={currentUser.webhook_token}
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
