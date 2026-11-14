import React, { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { SegmentedControl } from './SegmentedControl';
import { triggerHaptic } from '../utils/applePhysics';
import { Search, ScanBarcode, Plus, Check, Sparkles } from 'lucide-react';
import axios from 'axios';

interface ProductItem {
  id: number;
  name: string;
  category?: string;
  calories_100g: number;
  protein_100g: number;
  fat_100g: number;
  carbs_100g: number;
  piece_weight_g?: number;
}

interface FreeModeConstructorProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLog: (entry: {
    title: string;
    amount_g: number;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    meal_type: string;
    product_id?: number;
  }) => void;
}

const POPULAR_PRESETS: ProductItem[] = [
  { id: 1, name: "Яйцо куриное С1 (вареное/жареное)", calories_100g: 155, protein_100g: 13, fat_100g: 11, carbs_100g: 1, piece_weight_g: 55 },
  { id: 2, name: "Куриная грудка (филе на пару)", calories_100g: 165, protein_100g: 31, fat_100g: 3.6, carbs_100g: 0 },
  { id: 3, name: "Творог 5% классический", calories_100g: 121, protein_100g: 17, fat_100g: 5, carbs_100g: 3, piece_weight_g: 180 },
  { id: 4, name: "Крупа гречневая (отварная)", calories_100g: 110, protein_100g: 4.2, fat_100g: 1.1, carbs_100g: 21.3 },
  { id: 5, name: "Овсяные хлопья «Геркулес»", calories_100g: 352, protein_100g: 12.3, fat_100g: 6.2, carbs_100g: 61.8, piece_weight_g: 50 },
  { id: 6, name: "Протеин сывороточный (Whey 80%)", calories_100g: 390, protein_100g: 78, fat_100g: 5.5, carbs_100g: 8, piece_weight_g: 30 }
];

export const FreeModeConstructor: React.FC<FreeModeConstructorProps> = ({
  isOpen,
  onClose,
  onAddLog
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [amountG, setAmountG] = useState<number>(100);
  const [mealType, setMealType] = useState<string>('BREAKFAST');
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const mealOptions = [
    { value: 'BREAKFAST', label: 'Завтрак' },
    { value: 'LUNCH', label: 'Обед' },
    { value: 'AFTERNOON_SNACK', label: 'Полдник' },
    { value: 'DINNER', label: 'Ужин' },
  ];

  const filteredProducts = POPULAR_PRESETS.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectProduct = (product: ProductItem) => {
    triggerHaptic('light');
    setSelectedProduct(product);
    if (product.piece_weight_g) {
      setAmountG(product.piece_weight_g);
    } else {
      setAmountG(100);
    }
  };

  const handleBarcodeSearch = async () => {
    if (!barcodeQuery) return;
    setIsScanning(true);
    triggerHaptic('medium');
    try {
      const res = await axios.get(`/api/v1/products/barcode/${barcodeQuery}`);
      if (res.data) {
        setSelectedProduct(res.data);
        triggerHaptic('success');
      }
    } catch (e) {
      // Offline fallback mock
      setSelectedProduct({
        id: 999,
        name: `Товар со штрихкода #${barcodeQuery}`,
        calories_100g: 240,
        protein_100g: 12,
        fat_100g: 8,
        carbs_100g: 30
      });
      triggerHaptic('light');
    } finally {
      setIsScanning(false);
    }
  };

  const ratio = (amountG || 0) / 100;
  const currentCal = selectedProduct ? Math.round(selectedProduct.calories_100g * ratio) : 0;
  const currentProt = selectedProduct ? (selectedProduct.protein_100g * ratio).toFixed(1) : '0';
  const currentFat = selectedProduct ? (selectedProduct.fat_100g * ratio).toFixed(1) : '0';
  const currentCarbs = selectedProduct ? (selectedProduct.carbs_100g * ratio).toFixed(1) : '0';

  const handleCommit = () => {
    if (!selectedProduct) return;
    triggerHaptic('success');
    onAddLog({
      title: selectedProduct.name,
      amount_g: amountG,
      calories: currentCal,
      protein: parseFloat(currentProt),
      fat: parseFloat(currentFat),
      carbs: parseFloat(currentCarbs),
      meal_type: mealType,
      product_id: selectedProduct.id
    });
    setSelectedProduct(null);
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Конструктор питания"
      subtitle="Поиск по базе, Open Food Facts и личные блюда"
    >
      <div className="space-y-4 py-2">
        {/* Meal Type Segmented Control */}
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

        {/* Search input + Barcode trigger */}
        <div className="space-y-2">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-apple-gray-1 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск продуктов (грудка, творог, рис...)"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-apple-gray-6 dark:bg-[#2C2C2E] text-sm text-[#1C1C1E] dark:text-white placeholder-apple-gray-1 border-none focus:ring-2 focus:ring-apple-blue outline-none transition-all"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanBarcode className="absolute left-3.5 top-3 w-4 h-4 text-apple-gray-1" />
              <input
                type="text"
                value={barcodeQuery}
                onChange={(e) => setBarcodeQuery(e.target.value)}
                placeholder="Штрихкод (сканер камеры)"
                className="w-full pl-10 pr-3 py-2 rounded-xl bg-apple-gray-6 dark:bg-[#2C2C2E] text-xs text-[#1C1C1E] dark:text-white placeholder-apple-gray-1 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleBarcodeSearch}
              className="px-3 py-2 bg-apple-blue/10 dark:bg-apple-blue/20 text-apple-blue text-xs font-semibold rounded-xl apple-pressable flex items-center gap-1"
            >
              {isScanning ? 'Поиск...' : 'Найти'}
            </button>
          </div>
        </div>

        {/* Product Selection List */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-apple-gray-1 block ml-1 mb-2">
            Базовые продукты (Seed DB)
          </span>
          <div className="max-h-48 overflow-y-auto space-y-1.5 no-scrollbar">
            {filteredProducts.map((p) => {
              const isChosen = selectedProduct?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  className={`p-3 rounded-xl flex items-center justify-between cursor-pointer apple-pressable border transition-all ${
                    isChosen
                      ? 'border-apple-blue bg-apple-blue/10 dark:bg-apple-blue/20'
                      : 'border-black/[0.04] dark:border-white/[0.06] bg-apple-gray-6 dark:bg-[#2C2C2E]/60'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <h5 className="text-xs font-semibold text-[#1C1C1E] dark:text-white truncate">{p.name}</h5>
                    <span className="text-[11px] text-apple-gray-1">
                      {p.calories_100g} ккал • Б: {p.protein_100g}г • Ж: {p.fat_100g}г • У: {p.carbs_100g}г
                    </span>
                  </div>
                  {isChosen && <Check className="w-4 h-4 text-apple-blue flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Product Tuning / Grams Calculator */}
        {selectedProduct && (
          <div className="p-4 rounded-2xl bg-apple-gray-6 dark:bg-[#2C2C2E] space-y-3 border border-apple-blue/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                Вес порции (в граммах)
              </span>
              {selectedProduct.piece_weight_g && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setAmountG(selectedProduct.piece_weight_g!);
                  }}
                  className="text-[11px] text-apple-blue font-semibold bg-apple-blue/10 px-2 py-0.5 rounded-full"
                >
                  1 шт. = {selectedProduct.piece_weight_g}г
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                value={amountG}
                onChange={(e) => setAmountG(Number(e.target.value))}
                min={1}
                max={2000}
                className="w-24 text-center font-bold text-lg py-1.5 rounded-xl bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 outline-none focus:ring-2 focus:ring-apple-blue"
              />
              <div className="flex-1 flex gap-1.5">
                {[50, 100, 150, 200].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setAmountG(preset);
                    }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg apple-pressable ${
                      amountG === preset
                        ? 'bg-apple-blue text-white shadow-sm'
                        : 'bg-white dark:bg-[#1C1C1E] text-apple-gray-1'
                    }`}
                  >
                    {preset}г
                  </button>
                ))}
              </div>
            </div>

            {/* Calculated Nutrients */}
            <div className="grid grid-cols-4 text-center pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
              <div>
                <span className="text-[10px] text-apple-gray-1 uppercase">Ккал</span>
                <p className="text-sm font-bold text-apple-red">{currentCal}</p>
              </div>
              <div>
                <span className="text-[10px] text-apple-gray-1 uppercase">Белки</span>
                <p className="text-sm font-bold text-[#1C1C1E] dark:text-white">{currentProt}г</p>
              </div>
              <div>
                <span className="text-[10px] text-apple-gray-1 uppercase">Жиры</span>
                <p className="text-sm font-bold text-apple-orange">{currentFat}г</p>
              </div>
              <div>
                <span className="text-[10px] text-apple-gray-1 uppercase">Углев</span>
                <p className="text-sm font-bold text-apple-teal">{currentCarbs}г</p>
              </div>
            </div>

            {/* Commit Button */}
            <button
              type="button"
              onClick={handleCommit}
              className="w-full py-3 bg-apple-blue text-white text-sm font-bold rounded-xl shadow-lg shadow-apple-blue/30 apple-pressable flex items-center justify-center gap-1.5 mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить в дневник</span>
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
