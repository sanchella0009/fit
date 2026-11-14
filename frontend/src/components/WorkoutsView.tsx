import React, { useState } from 'react';
import { triggerHaptic } from '../utils/applePhysics';
import { Dumbbell, Plus, Check, Play, Flame, Timer, Sparkles, ChevronRight, Award } from 'lucide-react';
import { WorkoutTemplateItem, ActiveWorkoutSet } from '../types/auth';

interface WorkoutsViewProps {
  userId: number;
  onWorkoutComplete?: (calories: number) => void;
}

const DEFAULT_TEMPLATES: WorkoutTemplateItem[] = [
  {
    title: "Силовая: Грудь, Плечи, Трицепс",
    workout_type: "STRENGTH",
    notes: "Базовая тренировка для мышечной массы и рекомпозиции",
    exercises: [
      { exercise_name: "Жим штанги лежа", target_sets: 4, target_reps: 8, default_weight_kg: 60 },
      { exercise_name: "Жим гантелей на наклонной скамье", target_sets: 3, target_reps: 10, default_weight_kg: 22 },
      { exercise_name: "Армейский жим штанги стоя", target_sets: 3, target_reps: 10, default_weight_kg: 35 },
      { exercise_name: "Махи гантелей в стороны", target_sets: 4, target_reps: 12, default_weight_kg: 8 },
      { exercise_name: "Разгибания на блоке (трицепс)", target_sets: 3, target_reps: 12, default_weight_kg: 25 }
    ]
  },
  {
    title: "Силовая: Спина, Бицепс, Пресс",
    workout_type: "STRENGTH",
    notes: "Тяговый день для осанки, V-конуса и рельефа",
    exercises: [
      { exercise_name: "Подтягивания широким хватом", target_sets: 4, target_reps: 8, default_weight_kg: 0 },
      { exercise_name: "Тяга штанги в наклоне", target_sets: 4, target_reps: 10, default_weight_kg: 50 },
      { exercise_name: "Тяга верхнего блока к груди", target_sets: 3, target_reps: 12, default_weight_kg: 55 },
      { exercise_name: "Подъем штанги на бицепс", target_sets: 3, target_reps: 10, default_weight_kg: 30 },
      { exercise_name: "Скручивания на пресс", target_sets: 3, target_reps: 20, default_weight_kg: 0 }
    ]
  },
  {
    title: "Физкультура техникума / ОФП",
    workout_type: "PHYSICAL_EDUCATION",
    notes: "Нормативы техникума, разминка, челночный бег и отжимания",
    exercises: [
      { exercise_name: "Бег на 1000м / 2000м", target_sets: 1, target_reps: 1, default_weight_kg: 0 },
      { exercise_name: "Челночный бег 3x10м", target_sets: 3, target_reps: 1, default_weight_kg: 0 },
      { exercise_name: "Отжимания от пола", target_sets: 3, target_reps: 25, default_weight_kg: 0 },
      { exercise_name: "Подтягивания на перекладине", target_sets: 3, target_reps: 10, default_weight_kg: 0 }
    ]
  },
  {
    title: "Кардио & Степ (Сжигание жира)",
    workout_type: "CARDIO",
    notes: "Ходьба с уклоном на дорожке и степпер для дефицита калорий",
    exercises: [
      { exercise_name: "Ходьба на дорожке (уклон 12%, 5.5 км/ч)", target_sets: 1, target_reps: 35, default_weight_kg: 0 },
      { exercise_name: "Степпер / Подъемы по лестнице", target_sets: 1, target_reps: 15, default_weight_kg: 0 }
    ]
  }
];

export const WorkoutsView: React.FC<WorkoutsViewProps> = ({
  userId,
  onWorkoutComplete
}) => {
  const [activeWorkout, setActiveWorkout] = useState<{
    template: WorkoutTemplateItem;
    startTime: Date;
    exercises: Array<{
      name: string;
      sets: Array<{ setNum: number; weight: number; reps: number; completed: boolean }>;
    }>;
  } | null>(null);

  const [history, setHistory] = useState<Array<{
    title: string;
    date: string;
    duration: number;
    calories: number;
  }>>([
    { title: "Силовая: Грудь, Плечи, Трицепс", date: "Вчера, 18:30", duration: 52, calories: 420 },
    { title: "Физкультура техникума / ОФП", date: "11 ноября", duration: 45, calories: 350 },
    { title: "Кардио & Степ", date: "9 ноября", duration: 40, calories: 310 }
  ]);

  const handleStartTemplate = (tmpl: WorkoutTemplateItem) => {
    triggerHaptic('medium');
    const preparedExercises = tmpl.exercises.map(e => ({
      name: e.exercise_name,
      sets: Array.from({ length: e.target_sets }, (_, i) => ({
        setNum: i + 1,
        weight: e.default_weight_kg,
        reps: e.target_reps,
        completed: false
      }))
    }));

    setActiveWorkout({
      template: tmpl,
      startTime: new Date(),
      exercises: preparedExercises
    });
  };

  const handleToggleSet = (exIdx: number, setIdx: number) => {
    if (!activeWorkout) return;
    triggerHaptic('medium');
    const next = { ...activeWorkout };
    const currentStatus = next.exercises[exIdx].sets[setIdx].completed;
    next.exercises[exIdx].sets[setIdx].completed = !currentStatus;
    setActiveWorkout(next);
  };

  const handleQuickAddRep = (exIdx: number, setIdx: number) => {
    if (!activeWorkout) return;
    triggerHaptic('light');
    const next = { ...activeWorkout };
    next.exercises[exIdx].sets[setIdx].reps += 1;
    setActiveWorkout(next);
  };

  const handleQuickAddWeight = (exIdx: number, setIdx: number, delta: number) => {
    if (!activeWorkout) return;
    triggerHaptic('light');
    const next = { ...activeWorkout };
    next.exercises[exIdx].sets[setIdx].weight = Math.max(0, next.exercises[exIdx].sets[setIdx].weight + delta);
    setActiveWorkout(next);
  };

  const handleFinishWorkout = () => {
    if (!activeWorkout) return;
    triggerHaptic('success');
    const durationMins = Math.max(1, Math.round((new Date().getTime() - activeWorkout.startTime.getTime()) / 60000)) || 45;
    const caloriesBurned = Math.round(durationMins * 7.5);

    setHistory(prev => [
      {
        title: activeWorkout.template.title,
        date: "Сегодня",
        duration: durationMins,
        calories: caloriesBurned
      },
      ...prev
    ]);

    if (onWorkoutComplete) {
      onWorkoutComplete(caloriesBurned);
    }
    setActiveWorkout(null);
  };

  return (
    <div className="space-y-4">
      {/* Active Workout Screen */}
      {activeWorkout ? (
        <div className="space-y-4">
          {/* Active Workout Header Card */}
          <div className="apple-card p-4 border-2 border-apple-green/50 bg-apple-green/[0.04] dark:bg-apple-green/[0.08]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-apple-green uppercase tracking-wider flex items-center gap-1">
                  <Play className="w-3 h-3 fill-apple-green" />
                  <span>Идет тренировка</span>
                </span>
                <h3 className="text-lg font-bold text-[#1C1C1E] dark:text-white mt-0.5">
                  {activeWorkout.template.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleFinishWorkout}
                className="px-4 py-2 bg-apple-green text-white rounded-xl text-xs font-bold shadow-md apple-pressable flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Завершить</span>
              </button>
            </div>
          </div>

          {/* Exercises and Sets List */}
          <div className="space-y-3">
            {activeWorkout.exercises.map((ex, exIdx) => (
              <div key={exIdx} className="apple-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#1C1C1E] dark:text-white">{ex.name}</h4>
                  <span className="text-xs text-apple-gray-1 font-medium">{ex.sets.length} подходов</span>
                </div>

                <div className="space-y-2">
                  {ex.sets.map((s, sIdx) => (
                    <div
                      key={sIdx}
                      className={`p-2.5 rounded-xl flex items-center justify-between transition-all ${
                        s.completed
                          ? 'bg-apple-green/10 border border-apple-green/30'
                          : 'bg-apple-gray-6 dark:bg-[#2C2C2E]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-apple-gray-3/40 dark:bg-apple-gray-1/20 text-xs font-bold flex items-center justify-center">
                          {s.setNum}
                        </span>
                        <div className="text-xs">
                          <b className="text-sm">{s.weight > 0 ? `${s.weight} кг` : 'Свой вес'}</b> × <b>{s.reps} повт.</b>
                        </div>
                      </div>

                      {/* Quick Progression buttons: +1 повтор & +2.5 кг */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleQuickAddRep(exIdx, sIdx)}
                          className="px-2 py-1 bg-white dark:bg-[#3A3A3C] text-[11px] font-bold rounded-lg shadow-sm apple-pressable"
                        >
                          +1 повт
                        </button>
                        {s.weight > 0 && (
                          <button
                            type="button"
                            onClick={() => handleQuickAddWeight(exIdx, sIdx, 2.5)}
                            className="px-2 py-1 bg-white dark:bg-[#3A3A3C] text-[11px] font-bold rounded-lg shadow-sm apple-pressable"
                          >
                            +2.5кг
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleSet(exIdx, sIdx)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ml-1 ${
                            s.completed
                              ? 'bg-apple-green text-white shadow-sm'
                              : 'border-2 border-apple-gray-3 dark:border-apple-gray-1/40'
                          }`}
                        >
                          {s.completed && <Check className="w-4 h-4 stroke-[3]" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Header Title */}
          <div className="px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-apple-gray-1">
              Программы и прогрессия
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight text-[#1C1C1E] dark:text-white">
              Тренировочные шаблоны
            </h2>
          </div>

          {/* Templates Grid */}
          <div className="space-y-3">
            {DEFAULT_TEMPLATES.map((tmpl, idx) => (
              <div
                key={idx}
                className="apple-card p-4 transition-all apple-pressable-subtle"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-apple-blue/15 text-apple-blue flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Dumbbell className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-[#1C1C1E] dark:text-white leading-snug">
                        {tmpl.title}
                      </h4>
                      <p className="text-xs text-apple-gray-1 mt-0.5">{tmpl.notes}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {tmpl.exercises.slice(0, 3).map((e, eIdx) => (
                          <span
                            key={eIdx}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-apple-gray-6 dark:bg-[#2C2C2E] text-apple-gray-1 font-medium"
                          >
                            {e.exercise_name}
                          </span>
                        ))}
                        {tmpl.exercises.length > 3 && (
                          <span className="text-[11px] text-apple-blue font-semibold self-center">
                            +{tmpl.exercises.length - 3} упр.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartTemplate(tmpl)}
                    className="px-3.5 py-2 bg-apple-blue text-white rounded-xl text-xs font-bold shadow-md shadow-apple-blue/30 apple-pressable flex items-center gap-1.5 flex-shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Старт</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Workout History */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-apple-gray-1 px-1 block">
              История тренировок
            </span>
            <div className="space-y-2">
              {history.map((h, i) => (
                <div key={i} className="apple-card p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-apple-green/15 text-apple-green flex items-center justify-center">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-[#1C1C1E] dark:text-white">{h.title}</h5>
                      <span className="text-[11px] text-apple-gray-1">{h.date} • {h.duration} мин</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-apple-red">+{h.calories} ккал</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
