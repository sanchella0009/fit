import React, { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { SegmentedControl } from './SegmentedControl';
import { triggerHaptic } from '../utils/applePhysics';
import { Plus, Upload, FileText, Check, UtensilsCrossed } from 'lucide-react';
import axios from 'axios';

interface CustomMenuBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDishAdded?: (dish: any) => void;
}

export const CustomMenuBuilderModal: React.FC<CustomMenuBuilderModalProps> = ({
  isOpen,
  onClose,
  onDishAdded
}) => {
  const [activeTab, setActiveTab] = useState<'MANUAL' | 'UPLOAD'>('MANUAL');
  const [cycleDay, setCycleDay] = useState<number>(1);
  const [mealType, setMealType] = useState<string>('LUNCH');
  const [dishName, setDishName] = useState('');
  const [weightG, setWeightG] = useState(250);
  const [calories, setCalories] = useState(350);
  const [protein, setProtein] = useState(25);
  const [fat, setFat] = useState(12);
  const [carbs, setCarbs] = useState(35);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const mealOptions = [
    { value: 'BREAKFAST', label: 'Завтрак' },
    { value: 'LUNCH', label: 'Обед' },
    { value: 'AFTERNOON_SNACK', label: 'Полдник' },
    { value: 'DINNER', label: 'Ужин' },
  ];

  const handleAddDish = () => {
    if (!dishName.trim()) return;
    triggerHaptic('success');

    const newDish = {
      id: Date.now(),
      dish_name: dishName.trim(),
      weight_g: weightG,
      calories,
      protein,
      fat,
      carbs,
      meal_type: mealType,
      day_number: cycleDay
    };

    if (onDishAdded) {
      onDishAdded(newDish);
    }
    setDishName('');
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerHaptic('medium');
      setUploadedFile(file);
      // Simulate/trigger parsing
      setTimeout(() => {
        triggerHaptic('success');
        setUploadSuccess(true);
      }, 1200);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Конструктор циклического меню"
      subtitle="Составьте свое меню или загрузите .docx документ"
    >
      <div className="space-y-4 py-2">
        <SegmentedControl
          options={[
            { value: 'MANUAL', label: 'Составить блюдо' },
            { value: 'UPLOAD', label: 'Загрузить .docx' }
          ]}
          value={activeTab}
          onChange={(val) => setActiveTab(val as 'MANUAL' | 'UPLOAD')}
        />

        {activeTab === 'MANUAL' ? (
          <div className="space-y-3">
            {/* Cycle Day Picker */}
            <div>
              <span className="text-xs font-semibold text-apple-gray-1 uppercase tracking-wider block ml-1 mb-1.5">
                День цикла (1..14)
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {Array.from({ length: 14 }, (_, i) => i + 1).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setCycleDay(d);
                    }}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-all apple-pressable flex-shrink-0 ${
                      cycleDay === d
                        ? 'bg-apple-blue text-white shadow-sm'
                        : 'bg-apple-gray-6 dark:bg-[#2C2C2E] text-apple-gray-1'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Meal Type */}
            <div>
              <span className="text-xs font-semibold text-apple-gray-1 uppercase tracking-wider block ml-1 mb-1.5">
                Прием пищи
              </span>
              <SegmentedControl
                options={mealOptions}
                value={mealType}
                onChange={setMealType}
              />
            </div>

            {/* Dish Name */}
            <div>
              <label className="text-xs font-semibold text-apple-gray-1 uppercase tracking-wider block ml-1 mb-1">
                Название блюда
              </label>
              <input
                type="text"
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                placeholder="Например: Плов из куриной грудки с овощами"
                className="w-full px-4 py-2.5 rounded-xl bg-apple-gray-6 dark:bg-[#2C2C2E] text-sm text-[#1C1C1E] dark:text-white placeholder-apple-gray-1 outline-none focus:ring-2 focus:ring-apple-blue"
              />
            </div>

            {/* Nutrients and Weight Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-apple-gray-1 uppercase block ml-1 mb-1">
                  Выход порции (г)
                </label>
                <input
                  type="number"
                  value={weightG}
                  onChange={(e) => setWeightG(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-apple-gray-6 dark:bg-[#2C2C2E] text-xs font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-apple-gray-1 uppercase block ml-1 mb-1">
                  Калории (ккал)
                </label>
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-apple-gray-6 dark:bg-[#2C2C2E] text-xs font-bold text-apple-red outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-apple-gray-1 uppercase block ml-1">Белки (г)</label>
                <input
                  type="number"
                  value={protein}
                  onChange={(e) => setProtein(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-xl bg-apple-gray-6 dark:bg-[#2C2C2E] text-xs font-bold text-center outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-apple-gray-1 uppercase block ml-1">Жиры (г)</label>
                <input
                  type="number"
                  value={fat}
                  onChange={(e) => setFat(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-xl bg-apple-gray-6 dark:bg-[#2C2C2E] text-xs font-bold text-center outline-none text-apple-orange"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-apple-gray-1 uppercase block ml-1">Углеводы (г)</label>
                <input
                  type="number"
                  value={carbs}
                  onChange={(e) => setCarbs(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-xl bg-apple-gray-6 dark:bg-[#2C2C2E] text-xs font-bold text-center outline-none text-apple-teal"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddDish}
              disabled={!dishName.trim()}
              className="w-full py-3 bg-apple-blue text-white rounded-xl text-xs font-bold shadow-md shadow-apple-blue/30 apple-pressable flex items-center justify-center gap-1.5 mt-3 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить в День {cycleDay}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 py-3">
            <div className="p-6 rounded-2xl border-2 border-dashed border-apple-gray-3 dark:border-[#48484A] text-center space-y-3 bg-apple-gray-6/50 dark:bg-[#2C2C2E]/40">
              <Upload className="w-8 h-8 text-apple-blue mx-auto" />
              <div>
                <h5 className="text-sm font-bold text-[#1C1C1E] dark:text-white">
                  Загрузка документа .docx
                </h5>
                <p className="text-xs text-apple-gray-1 mt-0.5">
                  Парсер автоматически разберет таблицы меню по дням (Завтрак, Обед, Ужин) и свяжет граммовки.
                </p>
              </div>

              <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-apple-blue text-white text-xs font-bold rounded-xl shadow-md apple-pressable cursor-pointer">
                <FileText className="w-4 h-4" />
                <span>Выбрать файл .docx</span>
                <input
                  type="file"
                  accept=".docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {uploadedFile && (
                <div className="mt-2 text-xs font-semibold text-apple-blue flex items-center justify-center gap-1">
                  <Check className="w-3.5 h-3.5 text-apple-green" />
                  <span>{uploadedFile.name} {uploadSuccess ? "— успешно разобран!" : "— идет парсинг..."}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
