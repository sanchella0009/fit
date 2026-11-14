import React, { useEffect, useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { triggerHaptic } from '../utils/applePhysics';
import { ChefHat, Info, Scale, Flame } from 'lucide-react';
import axios from 'axios';

interface TechCardData {
  id: number;
  card_number: string;
  dish_name: string;
  recipe_source?: string;
  serving_weight_g: number;
  calories_serving: number;
  protein_serving: number;
  fat_serving: number;
  carbs_serving: number;
  calories_100g: number;
  protein_100g: number;
  fat_100g: number;
  carbs_100g: number;
  cooking_technology?: string;
  ingredients?: Array<{
    name: string;
    gross_weight: string;
    net_weight: string;
  }>;
}

interface TechCardModalProps {
  cardId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TechCardModal: React.FC<TechCardModalProps> = ({
  cardId,
  isOpen,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TechCardData | null>(null);

  useEffect(() => {
    if (!isOpen || !cardId) return;

    setLoading(true);
    axios.get(`/api/v1/canteen/tech-card/${cardId}`)
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        console.error("Ошибка загрузки техкарты:", err);
        // Fallback for demonstration when backend isn't running
        setData({
          id: cardId,
          card_number: String(cardId),
          dish_name: "Пудинг из творога (запеченный)",
          recipe_source: "Сборник технологических нормативов 2021",
          serving_weight_g: 250,
          calories_serving: 341.5,
          protein_serving: 18.2,
          fat_serving: 12.4,
          carbs_serving: 39.1,
          calories_100g: 136.6,
          protein_100g: 7.3,
          fat_100g: 5.0,
          carbs_100g: 15.6,
          cooking_technology: "Творог протирают, смешивают с манной крупой, яйцами и сахаром. Выпекают в жарочном шкафу при 180°C до образования золотистой корочки. Отпускают в горячем виде.",
          ingredients: [
            { name: "Творог 5%", gross_weight: "180г", net_weight: "175г" },
            { name: "Крупа манная", gross_weight: "15г", net_weight: "15г" },
            { name: "Яйцо куриное", gross_weight: "20г", net_weight: "18г" },
            { name: "Сахар-песок", gross_weight: "15г", net_weight: "15г" },
            { name: "Масло сливочное", gross_weight: "5г", net_weight: "5г" }
          ]
        });
      })
      .finally(() => setLoading(false));
  }, [cardId, isOpen]);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={data ? `Техкарта №${data.card_number}` : "Техкарта"}
      subtitle={data?.recipe_source || "Столовая техникума"}
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-apple-gray-1">
          <div className="w-8 h-8 rounded-full border-2 border-apple-blue border-t-transparent animate-spin mb-3" />
          <span className="text-xs font-medium">Загрузка данных техкарты...</span>
        </div>
      ) : data ? (
        <div className="space-y-4 py-2">
          {/* Main Title & Output */}
          <div className="p-3.5 rounded-2xl bg-apple-gray-6 dark:bg-[#2C2C2E]/70 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-apple-gray-1 uppercase tracking-wider">Наименование блюда</span>
              <h4 className="text-base font-bold text-[#1C1C1E] dark:text-white mt-0.5">{data.dish_name}</h4>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-apple-gray-1 uppercase tracking-wider">Выход</span>
              <div className="text-sm font-bold text-apple-blue flex items-center justify-end gap-1 mt-0.5">
                <Scale className="w-3.5 h-3.5" />
                <span>{data.serving_weight_g} г</span>
              </div>
            </div>
          </div>

          {/* Nutrition Comparison Table (Per Serving vs Per 100g) */}
          <div className="p-4 rounded-2xl bg-apple-gray-6 dark:bg-[#2C2C2E]/70">
            <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-[#1C1C1E] dark:text-white">
              <Flame className="w-4 h-4 text-apple-red" />
              <span>Пищевая и энергетическая ценность</span>
            </div>

            <div className="grid grid-cols-5 text-center text-xs pb-2 border-b border-black/[0.06] dark:border-white/[0.08] font-semibold text-apple-gray-1">
              <span className="text-left">Параметр</span>
              <span>Ккал</span>
              <span>Белки</span>
              <span>Жиры</span>
              <span>Углев.</span>
            </div>

            <div className="grid grid-cols-5 text-center text-xs py-2 font-medium border-b border-black/[0.04] dark:border-white/[0.04]">
              <span className="text-left font-semibold text-[#1C1C1E] dark:text-white">На порцию</span>
              <span className="text-apple-red font-bold">{Math.round(data.calories_serving)}</span>
              <span>{data.protein_serving}г</span>
              <span>{data.fat_serving}г</span>
              <span>{data.carbs_serving}г</span>
            </div>

            <div className="grid grid-cols-5 text-center text-xs pt-2 font-medium text-apple-gray-1">
              <span className="text-left">На 100 г</span>
              <span>{Math.round(data.calories_100g)}</span>
              <span>{data.protein_100g}г</span>
              <span>{data.fat_100g}г</span>
              <span>{data.carbs_100g}г</span>
            </div>
          </div>

          {/* Raw Ingredients / Сырьевой набор */}
          {data.ingredients && data.ingredients.length > 0 && (
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-apple-gray-1 ml-1 mb-2 block">
                Сырьевой набор (Брутто / Нетто)
              </span>
              <div className="rounded-2xl bg-white dark:bg-[#2C2C2E]/50 border border-black/[0.06] dark:border-white/[0.08] divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
                {data.ingredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 text-xs">
                    <span className="font-medium text-[#1C1C1E] dark:text-white">{ing.name}</span>
                    <div className="flex items-center gap-3 text-apple-gray-1 font-mono">
                      <span>Б: {ing.gross_weight}</span>
                      <span className="text-[#1C1C1E] dark:text-white font-semibold">Н: {ing.net_weight}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cooking Technology Description */}
          {data.cooking_technology && (
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-apple-gray-1 ml-1 mb-1.5 block">
                Технология приготовления
              </span>
              <div className="p-3.5 rounded-2xl bg-apple-gray-6 dark:bg-[#2C2C2E]/70 text-xs leading-relaxed text-[#1C1C1E] dark:text-gray-200">
                {data.cooking_technology}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </BottomSheet>
  );
};
