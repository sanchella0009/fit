import os
import json
import httpx
from typing import Dict, Any, Optional

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

def fallback_expert_analysis(
    sleep_data: Dict[str, Any],
    nutrition_data: Dict[str, Any],
    workout_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Автономный экспертный алгоритм спортивной сомнологии и рекомпозиции тела
    (срабатывает при отсутствии ключа Gemini или временной недоступности сети).
    """
    duration = float(sleep_data.get("duration_hours", 7.5))
    deep = float(sleep_data.get("deep_sleep_hours", 1.5) or 1.5)
    quality = int(sleep_data.get("quality_rating", 4))
    
    # 1. Расчет Recovery Score (0..100)
    score = 60
    if duration >= 8.0:
        score += 20
    elif duration >= 7.0:
        score += 15
    elif duration >= 6.0:
        score += 5
    else:
        score -= 20

    if deep >= 1.8:
        score += 15
    elif deep >= 1.2:
        score += 10
    else:
        score -= 10

    score += (quality - 3) * 5
    recovery_score = max(35, min(98, score))

    # Анализ позднего ужина
    late_meal = nutrition_data.get("late_meal")
    late_time = nutrition_data.get("late_time")

    if late_meal:
        nutrition_text = (
            f"Вечерний прием пищи ({late_meal}" +
            (f" в {late_time}" if late_time else "") +
            ") обеспечил ночной аминокислотный пул без перегрузки ЖКТ. Казеин и легкие углеводы способствовали синтезу серотонина и мелатонина."
        )
    else:
        nutrition_text = "Ночной период прошел на пустой желудок. Рекомендуется включать легкий белковый перекус (кефир или творог) за 1-1.5 часа до сна для поддержания мышечного анаболизма."

    # СТГ и Кортизол
    if deep >= 1.5 and duration >= 7.0:
        somato = "Пиковая выработка соматотропина (СТГ). Глубокая фаза сна обеспечила максимальное восстановление миофибрилл и расщепление жировых депо."
        cortisol = "Кортизол в оптимальном утреннем коридоре. Низкий риск катаболизма и мышечного распада."
    else:
        somato = "Сниженная секреция гормона роста из-за сокращенной фазы глубокого сна. Восстановление мышц может занять на 20-30% больше времени."
        cortisol = "Повышенный уровень кортизола из-за дефицита глубокого сна. Необходим контроль стресса и дополнительный отдых."

    if recovery_score >= 80:
        readiness = "ЦНС и скелетная мускулатура полностью восстановлены. Рекомендована полноценная силовая тренировка с высокой интенсивностью."
    elif recovery_score >= 65:
        readiness = "Умеренная готовность. Допустимы тренировки средней интенсивности (объемная работа, 65-75% от 1ПМ) или кардио."
    else:
        readiness = "ЦНС утомлена. Рекомендуется день активного восстановления (прогулка 10 000 шагов, растяжка, легкая мобилизация)."

    return {
        "recovery_score": recovery_score,
        "verdict": f"Индекс восстановления: {recovery_score}% • " + ("Оптимально для рекомпозиции" if recovery_score >= 75 else "Умеренное восстановление"),
        "somatotropin_status": somato,
        "cortisol_status": cortisol,
        "nutrition_correlation": nutrition_text,
        "workout_readiness": readiness,
        "actionable_tips": [
            f"Целевая продолжительность сна следующей ночью: не менее {max(8.0, duration):.1f} ч для компенсации фаз глубокого сна.",
            "Для максимизации синтеза белка распределите суточную норму белка на 4-5 приемов каждые 3-4 часа.",
            "Пейте достаточное количество воды с электролитами (500 мл сразу после пробуждения).",
            "Ограничьте яркий синий свет экранов за 45 минут до сна для повышения эндогенного мелатонина."
        ],
        "is_ai_generated": False,
        "model": "offline-expert-v1"
    }

async def analyze_sleep_with_gemini(
    user_context: Dict[str, Any],
    sleep_data: Dict[str, Any],
    nutrition_data: Dict[str, Any],
    workout_data: Dict[str, Any],
    api_key_override: Optional[str] = None
) -> Dict[str, Any]:
    """
    Генерирует интеллектуальный анализ сна, питания и тренировок через Gemini API.
    При отсутствии ключа прозрачно возвращает проверенный научный анализ fallback_expert_analysis.
    """
    api_key = api_key_override or os.environ.get("GEMINI_API_KEY")

    if not api_key:
        print("[GeminiSleep] GEMINI_API_KEY не задан, используется встроенный экспертный модуль.")
        return fallback_expert_analysis(sleep_data, nutrition_data, workout_data)

    system_instruction = (
        "Ты — ведущий сомнолог, спортивный эндокринолог и специалист по доказательной рекомпозиции тела "
        "(одновременное снижение жира и наращивание мышечной массы). "
        "Твоя задача — проанализировать ночной сон спортсмена во взаимосвязи с его питанием за прошлый день "
        "(включая вечерний ужин / время жора), дневной активностью и тренировками. "
        "Отвечай строго валидным JSON на русском языке без markdown блоков (без ```json), содержащим поля:\n"
        "- recovery_score (целое число от 0 до 100, честная оценка готовности тела)\n"
        "- verdict (краткая емкая фраза с оценкой восстановления)\n"
        "- somatotropin_status (статус выработки соматотропина / гормона роста за ночь)\n"
        "- cortisol_status (риск катаболизма и статус кортизола)\n"
        "- nutrition_correlation (детальный анализ: как вчерашняя еда, время вечернего ужина и БЖУ повлияли на ночной сон)\n"
        "- workout_readiness (рекомендация: можно ли сегодня тяжело тренироваться или нужен разгрузочный день)\n"
        "- actionable_tips (массив из 3-4 конкретных практических советов на сегодня)"
    )

    prompt = f"""
ДАННЫЕ СПОРТСМЕНА:
Имя: {user_context.get('username', 'Атлет')}
Роль/Режим: {user_context.get('dietary_mode', 'DORMITORY')}
Цели КБЖУ: Калории {user_context.get('target_calories')} ккал, Белки {user_context.get('target_protein_g')} г, Вес {user_context.get('weight_kg')} кг.

ПОКАЗАТЕЛИ СНА ЗА ПРОШЕДШУЮ НОЧЬ:
- Дата сна: {sleep_data.get('sleep_date')}
- Время отбоя: {sleep_data.get('bed_time', '23:30')}
- Время подъема: {sleep_data.get('wake_time', '07:30')}
- Общая продолжительность: {sleep_data.get('duration_hours', 8.0)} ч
- Глубокий сон (Deep): {sleep_data.get('deep_sleep_hours', 1.8)} ч
- Быстрый сон (REM): {sleep_data.get('rem_sleep_hours', 1.6)} ч
- Субъективное качество: {sleep_data.get('quality_rating', 4)} из 5
- Заметки спортсмена: {sleep_data.get('notes', 'Нормально')}

ПИТАНИЕ И ВЕЧЕРНИЙ УЖИН ЗА ДЕНЬ:
- Съедено ккал: {nutrition_data.get('consumed_calories', 2400)} ккал
- Белки: {nutrition_data.get('consumed_protein', 160)} г
- Поздний ужин (время жора): {nutrition_data.get('late_meal', 'Кефир 200г, Батон «Столовый» 25г')} в {nutrition_data.get('late_time', '22:30')}

АКТИВНОСТЬ И ТРЕНИРОВКИ:
- Шагов: {workout_data.get('steps', 8500)}
- Активных ккал: {workout_data.get('active_calories', 450)}
- Тренировка: {workout_data.get('workout_title', 'Силовая')}

Сформируй профессиональный отчет в формате JSON.
"""

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": system_instruction + "\n\n" + prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "responseMimeType": "application/json"
        }
    }

    try:
        url = f"{GEMINI_API_URL}?key={api_key}"
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                print(f"[GeminiSleep] API Error {resp.status_code}: {resp.text}")
                fallback = fallback_expert_analysis(sleep_data, nutrition_data, workout_data)
                fallback["api_notice"] = f"Gemini API HTTP {resp.status_code}, показан локальный анализ"
                return fallback

            result = resp.json()
            raw_text = result["candidates"][0]["content"]["parts"][0]["text"].strip()
            
            # Убираем возможные markdown backticks
            if raw_text.startswith("```"):
                raw_text = raw_text.strip("`")
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:].strip()

            parsed = json.loads(raw_text)
            parsed["is_ai_generated"] = True
            parsed["model"] = "gemini-1.5-flash"
            return parsed

    except Exception as e:
        print(f"[GeminiSleep] Exception calling Gemini: {e}")
        fallback = fallback_expert_analysis(sleep_data, nutrition_data, workout_data)
        fallback["api_notice"] = f"Сбой соединения с Gemini ({str(e)}), показан локальный экспертный анализ"
        return fallback
