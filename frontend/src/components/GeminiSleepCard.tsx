import React, { useState, useEffect } from 'react';
import { triggerHaptic } from '../utils/applePhysics';
import { BottomSheet } from './BottomSheet';
import {
  Moon,
  Sparkles,
  Clock,
  Activity,
  Zap,
  RefreshCw,
  Key,
  ShieldCheck,
  ChevronRight,
  Flame,
  Check,
  BedDouble
} from 'lucide-react';
import axios from 'axios';

interface GeminiAnalysisData {
  recovery_score: number;
  verdict: string;
  somatotropin_status: string;
  cortisol_status: string;
  nutrition_correlation: string;
  workout_readiness: string;
  actionable_tips: string[];
  is_ai_generated?: boolean;
  model?: string;
  api_notice?: string;
}

interface SleepCardProps {
  userId: number;
  onRecoveryScoreUpdate?: (score: number) => void;
}

export const GeminiSleepCard: React.FC<SleepCardProps> = ({
  userId,
  onRecoveryScoreUpdate
}) => {
  const [durationHours, setDurationHours] = useState<number>(8.0);
  const [deepHours, setDeepHours] = useState<number>(1.8);
  const [remHours, setRemHours] = useState<number>(1.6);
  const [bedTime, setBedTime] = useState<string>("23:30");
  const [wakeTime, setWakeTime] = useState<string>("07:30");
  const [qualityRating, setQualityRating] = useState<number>(4);
  const [notes, setNotes] = useState<string>("");

  const [analysis, setAnalysis] = useState<GeminiAnalysisData | null>(null);
  const [recoveryScore, setRecoveryScore] = useState<number>(85);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem('recomp_gemini_api_key') || "";
  });

  // Load latest sleep record
  useEffect(() => {
    if (!userId) return;
    axios.get(`/api/v1/sleep/latest?user_id=${userId}`)
      .then((res) => {
        if (res.data) {
          const d = res.data;
          setDurationHours(d.duration_hours || 8.0);
          setDeepHours(d.deep_sleep_hours || 1.8);
          setRemHours(d.rem_sleep_hours || 1.6);
          setBedTime(d.bed_time || "23:30");
          setWakeTime(d.wake_time || "07:30");
          setQualityRating(d.quality_rating || 4);
          setNotes(d.notes || "");
          if (d.recovery_score) {
            setRecoveryScore(d.recovery_score);
            if (onRecoveryScoreUpdate) onRecoveryScoreUpdate(d.recovery_score);
          }
          if (d.ai_analysis) {
            setAnalysis(d.ai_analysis);
          }
        }
      })
      .catch((err) => console.log("Sleep load notice:", err));
  }, [userId]);

  const handleSaveSleep = async () => {
    triggerHaptic('medium');
    try {
      await axios.post('/api/v1/sleep/log', {
        user_id: userId,
        duration_hours: durationHours,
        deep_sleep_hours: deepHours,
        rem_sleep_hours: remHours,
        bed_time: bedTime,
        wake_time: wakeTime,
        quality_rating: qualityRating,
        notes: notes
      });
      triggerHaptic('success');
      setIsEditModalOpen(false);
      // Auto re-analyze with updated metrics
      handleRunAnalysis();
    } catch (e) {
      triggerHaptic('error');
    }
  };

  const handleRunAnalysis = async () => {
    setIsLoading(true);
    triggerHaptic('medium');
    try {
      const res = await axios.post('/api/v1/sleep/analyze', {
        user_id: userId,
        api_key: geminiApiKey.trim() || undefined
      });
      if (res.data && res.data.analysis) {
        setAnalysis(res.data.analysis);
        if (res.data.analysis.recovery_score) {
          setRecoveryScore(res.data.analysis.recovery_score);
          if (onRecoveryScoreUpdate) onRecoveryScoreUpdate(res.data.analysis.recovery_score);
        }
        triggerHaptic('success');
      }
    } catch (err: any) {
      triggerHaptic('error');
      console.error("Gemini analysis error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApiKey = () => {
    triggerHaptic('success');
    localStorage.setItem('recomp_gemini_api_key', geminiApiKey.trim());
    setIsApiKeyModalOpen(false);
  };

  // Phase percentages
  const deepPct = Math.round((deepHours / durationHours) * 100) || 22;
  const remPct = Math.round((remHours / durationHours) * 100) || 20;
  const corePct = Math.max(10, 100 - deepPct - remPct);

  return (
    <div className="space-y-4">
      {/* Main Sleep & Recovery Card */}
      <div className="apple-card p-5 relative overflow-hidden border border-purple-500/20 bg-gradient-to-br from-[#1C1C1E]/5 via-purple-500/[0.04] to-indigo-500/[0.06] dark:from-[#1C1C1E] dark:via-[#251b3a] dark:to-[#171b30]">
        
        {/* Header row */}
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Google Gemini AI
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-apple-green animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-[#1C1C1E] dark:text-white leading-tight">
                Сон и Восстановление
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsApiKeyModalOpen(true);
              }}
              title="Настройки Gemini API Key"
              className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold apple-pressable flex items-center gap-1"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">{geminiApiKey ? 'API активен' : 'Ключ AI'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsEditModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-apple-gray-6 dark:bg-[#2C2C2E] text-xs font-semibold text-[#1C1C1E] dark:text-white apple-pressable"
            >
              Изменить
            </button>
          </div>
        </div>

        {/* Sleep Metrics Overview */}
        <div className="grid grid-cols-3 gap-3 py-4">
          <div className="p-3 rounded-2xl bg-white/60 dark:bg-[#2C2C2E]/60 backdrop-blur-sm border border-black/[0.04] dark:border-white/[0.04]">
            <span className="text-[10px] uppercase font-bold text-apple-gray-1 block">Длительность</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-[#1C1C1E] dark:text-white">{durationHours}</span>
              <span className="text-xs text-apple-gray-1">часов</span>
            </div>
            <span className="text-[11px] text-apple-gray-1 mt-0.5 block truncate">
              {bedTime} → {wakeTime}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white/60 dark:bg-[#2C2C2E]/60 backdrop-blur-sm border border-black/[0.04] dark:border-white/[0.04]">
            <span className="text-[10px] uppercase font-bold text-purple-500 block">Глубокий (Deep)</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{deepHours}</span>
              <span className="text-xs text-apple-gray-1">ч</span>
            </div>
            <span className="text-[11px] text-apple-gray-1 mt-0.5 block">
              {deepPct}% от ночи
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white/60 dark:bg-[#2C2C2E]/60 backdrop-blur-sm border border-black/[0.04] dark:border-white/[0.04]">
            <span className="text-[10px] uppercase font-bold text-indigo-500 block">Recovery Score</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-2xl font-black ${recoveryScore >= 80 ? 'text-apple-green' : recoveryScore >= 60 ? 'text-apple-orange' : 'text-apple-red'}`}>
                {recoveryScore}%
              </span>
            </div>
            <span className="text-[11px] text-apple-gray-1 mt-0.5 block">
              {recoveryScore >= 80 ? 'Готов к рекордам' : 'Умеренно'}
            </span>
          </div>
        </div>

        {/* Visual Phases Bar */}
        <div className="space-y-1.5 pb-3">
          <div className="flex justify-between text-[11px] text-apple-gray-1 font-medium">
            <span>Фазы ночного сна</span>
            <span>Глубокий • REM • Базовый</span>
          </div>
          <div className="h-3 w-full rounded-full bg-apple-gray-5 dark:bg-[#3A3A3C] overflow-hidden flex">
            <div
              style={{ width: `${deepPct}%` }}
              className="h-full bg-purple-600 transition-all duration-500"
              title={`Глубокий: ${deepHours}ч (${deepPct}%)`}
            />
            <div
              style={{ width: `${remPct}%` }}
              className="h-full bg-indigo-400 transition-all duration-500"
              title={`Быстрый REM: ${remHours}ч (${remPct}%)`}
            />
            <div
              style={{ width: `${corePct}%` }}
              className="h-full bg-blue-500/60 transition-all duration-500"
              title={`Базовый: ${corePct}%`}
            />
          </div>
        </div>

        {/* Trigger Gemini Analysis Button */}
        <button
          type="button"
          onClick={handleRunAnalysis}
          disabled={isLoading}
          className="w-full py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 apple-pressable flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Gemini анализирует сон и питание...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{analysis ? 'Обновить ИИ-анализ Gemini' : 'Запустить ИИ-анализ сна и восстановления'}</span>
            </>
          )}
        </button>

        {/* Gemini AI Detailed Analysis Report */}
        {analysis && (
          <div className="mt-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.08] space-y-3">
            {/* Verdict */}
            <div className="p-3 rounded-2xl bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/20 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                  Вердикт ИИ-аналитика ({analysis.model || 'Gemini 1.5 Flash'})
                </span>
                <p className="text-xs font-semibold text-[#1C1C1E] dark:text-white mt-0.5">
                  {analysis.verdict}
                </p>
              </div>
            </div>

            {/* Endocrinology Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-white/70 dark:bg-[#2C2C2E]/70 border border-black/[0.04] dark:border-white/[0.04]">
                <span className="text-[10px] uppercase font-bold text-apple-teal block">
                  Гормон роста (Соматотропин)
                </span>
                <p className="text-xs text-[#1C1C1E] dark:text-gray-200 mt-1 leading-relaxed">
                  {analysis.somatotropin_status}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white/70 dark:bg-[#2C2C2E]/70 border border-black/[0.04] dark:border-white/[0.04]">
                <span className="text-[10px] uppercase font-bold text-apple-orange block">
                  Кортизол и Катаболизм
                </span>
                <p className="text-xs text-[#1C1C1E] dark:text-gray-200 mt-1 leading-relaxed">
                  {analysis.cortisol_status}
                </p>
              </div>
            </div>

            {/* Nutrition & Late Dinner Correlation */}
            <div className="p-3 rounded-2xl bg-white/70 dark:bg-[#2C2C2E]/70 border border-black/[0.04] dark:border-white/[0.04]">
              <span className="text-[10px] uppercase font-bold text-apple-blue flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Влияние питания и времени жора на сон</span>
              </span>
              <p className="text-xs text-[#1C1C1E] dark:text-gray-200 mt-1 leading-relaxed">
                {analysis.nutrition_correlation}
              </p>
            </div>

            {/* Workout Readiness */}
            <div className="p-3 rounded-2xl bg-white/70 dark:bg-[#2C2C2E]/70 border border-black/[0.04] dark:border-white/[0.04]">
              <span className="text-[10px] uppercase font-bold text-apple-green flex items-center gap-1">
                <Activity className="w-3 h-3" />
                <span>Готовность к тренировкам сегодня</span>
              </span>
              <p className="text-xs text-[#1C1C1E] dark:text-gray-200 mt-1 leading-relaxed">
                {analysis.workout_readiness}
              </p>
            </div>

            {/* Actionable Tips */}
            {analysis.actionable_tips && analysis.actionable_tips.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-apple-gray-1 block ml-1">
                  План действий на сегодня
                </span>
                <div className="space-y-1.5">
                  {analysis.actionable_tips.map((tip, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-apple-gray-6 dark:bg-[#2C2C2E]/50 text-xs text-[#1C1C1E] dark:text-white flex items-start gap-2"
                    >
                      <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-tight">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Sleep Modal */}
      <BottomSheet
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Запись сна"
        subtitle="Зафиксируйте показатели ночного отдыха"
      >
        <div className="space-y-4 py-2">
          {/* Times grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-apple-gray-1 uppercase tracking-wider block ml-1 mb-1">
                Отбой (заснул)
              </label>
              <input
                type="time"
                value={bedTime}
                onChange={(e) => setBedTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-apple-gray-6 dark:bg-[#2C2C2E] text-sm font-bold text-[#1C1C1E] dark:text-white outline-none border border-black/10 dark:border-white/10"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-apple-gray-1 uppercase tracking-wider block ml-1 mb-1">
                Подъем (проснулся)
              </label>
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-apple-gray-6 dark:bg-[#2C2C2E] text-sm font-bold text-[#1C1C1E] dark:text-white outline-none border border-black/10 dark:border-white/10"
              />
            </div>
          </div>

          {/* Durations */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-[#1C1C1E] dark:text-white">
                Общее время сна: <b className="text-purple-600 dark:text-purple-400">{durationHours} ч</b>
              </span>
            </div>
            <input
              type="range"
              min="4"
              max="12"
              step="0.25"
              value={durationHours}
              onChange={(e) => setDurationHours(parseFloat(e.target.value))}
              className="w-full accent-purple-600"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-[#1C1C1E] dark:text-white">
                Глубокий сон (Deep): <b className="text-purple-600 dark:text-purple-400">{deepHours} ч</b>
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="4.0"
              step="0.1"
              value={deepHours}
              onChange={(e) => setDeepHours(parseFloat(e.target.value))}
              className="w-full accent-purple-600"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-[#1C1C1E] dark:text-white">
                Быстрый сон (REM): <b className="text-indigo-500">{remHours} ч</b>
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="4.0"
              step="0.1"
              value={remHours}
              onChange={(e) => setRemHours(parseFloat(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          {/* Quality Rating 1..5 */}
          <div>
            <span className="text-xs font-semibold text-apple-gray-1 uppercase tracking-wider block ml-1 mb-1.5">
              Качество пробуждения (1..5)
            </span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((stars) => (
                <button
                  key={stars}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setQualityRating(stars);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold apple-pressable ${
                    qualityRating === stars
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-apple-gray-6 dark:bg-[#2C2C2E] text-apple-gray-1'
                  }`}
                >
                  {stars} ★
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveSleep}
            className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-bold shadow-md apple-pressable flex items-center justify-center gap-1.5 mt-3"
          >
            <Check className="w-4 h-4" />
            <span>Сохранить и запустить анализ</span>
          </button>
        </div>
      </BottomSheet>

      {/* Gemini API Key Modal */}
      <BottomSheet
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        title="Настройки Gemini AI"
        subtitle="Бесплатный API ключ Google AI Studio"
      >
        <div className="space-y-4 py-2">
          <p className="text-xs text-apple-gray-1 leading-relaxed">
            Приложение использует модель <b>Gemini 1.5 Flash</b>. Вы можете получить бесплатный ключ в{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-purple-600 dark:text-purple-400 font-semibold underline"
            >
              Google AI Studio
            </a>{' '}
            или пользоваться встроенным автономным экспертным движком без ограничений.
          </p>

          <div>
            <label className="text-xs font-semibold text-apple-gray-1 uppercase tracking-wider block ml-1 mb-1">
              GEMINI_API_KEY
            </label>
            <div className="relative flex items-center">
              <Key className="absolute left-3.5 w-4 h-4 text-apple-gray-1 pointer-events-none" />
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-apple-gray-6 dark:bg-[#2C2C2E] text-sm text-[#1C1C1E] dark:text-white placeholder-apple-gray-1 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveApiKey}
            className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-bold shadow-md apple-pressable flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Сохранить ключ в браузере</span>
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};
