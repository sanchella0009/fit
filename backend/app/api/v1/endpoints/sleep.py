import datetime as dt
import json
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.models.db_schema import User, SleepLog, FoodLog, WorkoutLog, HealthSyncMetric
from app.seeds.seed_runner import SessionLocal
from app.services.gemini_sleep_service import analyze_sleep_with_gemini

router = APIRouter(prefix="/sleep", tags=["Sleep Tracking & Gemini AI Analysis"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class SleepEntryCreate(BaseModel):
    user_id: int
    sleep_date: dt.date = Field(default_factory=dt.date.today, description="Дата пробуждения")
    bed_time: Optional[str] = Field(default="23:30", description="Время засыпания (HH:MM)")
    wake_time: Optional[str] = Field(default="07:30", description="Время пробуждения (HH:MM)")
    duration_hours: float = Field(default=8.0, description="Продолжительность сна в часах")
    deep_sleep_hours: Optional[float] = Field(default=1.8, description="Фаза глубокого сна (ч)")
    rem_sleep_hours: Optional[float] = Field(default=1.6, description="Фаза быстрого сна REM (ч)")
    quality_rating: Optional[int] = Field(default=4, description="Субъективная оценка сна (1..5)")
    notes: Optional[str] = Field(default=None, description="Заметки о самочувствии")

class GeminiAnalyzeRequest(BaseModel):
    user_id: int
    sleep_date: Optional[dt.date] = None
    api_key: Optional[str] = Field(default=None, description="Пользовательский API-ключ Gemini (опционально)")

@router.get("/latest")
def get_latest_sleep(
    user_id: int = Query(..., description="ID пользователя"),
    db: Session = Depends(get_db)
):
    """
    Возвращает последнюю запись сна и сохраненный анализ Gemini AI.
    Если записей нет — возвращает дефолтный шаблон для быстрого старта.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    latest_log = db.query(SleepLog).filter(
        SleepLog.user_id == user.id
    ).order_by(SleepLog.sleep_date.desc()).first()

    if latest_log:
        analysis_data = None
        if latest_log.ai_analysis_json:
            try:
                analysis_data = json.loads(latest_log.ai_analysis_json)
            except Exception:
                analysis_data = None

        return {
            "has_data": True,
            "id": latest_log.id,
            "sleep_date": str(latest_log.sleep_date),
            "bed_time": latest_log.bed_time,
            "wake_time": latest_log.wake_time,
            "duration_hours": latest_log.duration_hours,
            "deep_sleep_hours": latest_log.deep_sleep_hours,
            "rem_sleep_hours": latest_log.rem_sleep_hours,
            "quality_rating": latest_log.quality_rating,
            "notes": latest_log.notes,
            "recovery_score": latest_log.ai_recovery_score or 82,
            "verdict": latest_log.ai_verdict or "Анализ готов к обновлению",
            "ai_analysis": analysis_data
        }

    # Возврат эталонного шаблона
    return {
        "has_data": False,
        "sleep_date": str(dt.date.today()),
        "bed_time": "23:15",
        "wake_time": "07:15",
        "duration_hours": 8.0,
        "deep_sleep_hours": 1.9,
        "rem_sleep_hours": 1.6,
        "quality_rating": 4,
        "notes": "Полноценный сон",
        "recovery_score": 85,
        "verdict": "Нажмите «Анализировать сон через Gemini» для персонального отчета",
        "ai_analysis": None
    }

@router.post("/log", status_code=status.HTTP_201_CREATED)
def log_sleep_metrics(payload: SleepEntryCreate, db: Session = Depends(get_db)):
    """
    Сохраняет или обновляет сон за выбранную дату.
    """
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    existing = db.query(SleepLog).filter(
        SleepLog.user_id == user.id,
        SleepLog.sleep_date == payload.sleep_date
    ).first()

    if existing:
        existing.bed_time = payload.bed_time
        existing.wake_time = payload.wake_time
        existing.duration_hours = payload.duration_hours
        existing.deep_sleep_hours = payload.deep_sleep_hours
        existing.rem_sleep_hours = payload.rem_sleep_hours
        existing.quality_rating = payload.quality_rating
        existing.notes = payload.notes
        db.commit()
        db.refresh(existing)
        target_log = existing
    else:
        new_log = SleepLog(
            user_id=user.id,
            sleep_date=payload.sleep_date,
            bed_time=payload.bed_time,
            wake_time=payload.wake_time,
            duration_hours=payload.duration_hours,
            deep_sleep_hours=payload.deep_sleep_hours,
            rem_sleep_hours=payload.rem_sleep_hours,
            quality_rating=payload.quality_rating,
            notes=payload.notes
        )
        db.add(new_log)
        db.commit()
        db.refresh(new_log)
        target_log = new_log

    return {
        "status": "success",
        "id": target_log.id,
        "sleep_date": str(target_log.sleep_date),
        "duration_hours": target_log.duration_hours
    }

@router.post("/analyze")
async def run_gemini_sleep_analysis(
    payload: GeminiAnalyzeRequest,
    x_gemini_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Запускает интеллектуальный анализ ночного сна через Google Gemini AI
    с корреляцией питания (особенно времени жора / вечернего ужина) и тренировок.
    """
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    check_date = payload.sleep_date or dt.date.today()

    sleep_record = db.query(SleepLog).filter(
        SleepLog.user_id == user.id,
        SleepLog.sleep_date == check_date
    ).first()

    if not sleep_record:
        # Автоматически создаем базовую запись на сегодня
        sleep_record = SleepLog(
            user_id=user.id,
            sleep_date=check_date,
            bed_time="23:30",
            wake_time="07:30",
            duration_hours=8.0,
            deep_sleep_hours=1.8,
            rem_sleep_hours=1.5,
            quality_rating=4,
            notes="Обычный сон"
        )
        db.add(sleep_record)
        db.commit()
        db.refresh(sleep_record)

    # 1. Извлекаем питание за предыдущий день (включая вечерний ужин)
    yesterday = check_date - dt.timedelta(days=1)
    food_records = db.query(FoodLog).filter(
        FoodLog.user_id == user.id,
        FoodLog.log_date == yesterday
    ).all()

    tot_cal = sum(f.calories for f in food_records)
    tot_prot = sum(f.protein for f in food_records)

    late_dish = None
    late_time = None
    for f in food_records:
        meal_name = f.meal_type.value if hasattr(f.meal_type, "value") else str(f.meal_type)
        if meal_name in ["LATE_DINNER", "DINNER", "SNACK"]:
            late_dish = f.title_snapshot
            late_time = f.meal_time or "22:45"

    nutrition_context = {
        "consumed_calories": round(tot_cal, 1),
        "consumed_protein": round(tot_prot, 1),
        "late_meal": late_dish or "Кефир 200г, Батон «Столовый» 25г",
        "late_time": late_time or "22:30"
    }

    # 2. Извлекаем шаги и активность за вчера
    metric = db.query(HealthSyncMetric).filter(
        HealthSyncMetric.user_id == user.id,
        HealthSyncMetric.date == yesterday
    ).first()

    workout_context = {
        "steps": metric.steps if metric else 8500,
        "active_calories": metric.active_calories if metric else 450.0,
        "workout_title": "Силовая тренировка / ОФП"
    }

    # 3. Контекст пользователя
    user_context = {
        "username": user.username,
        "dietary_mode": user.dietary_mode.value if hasattr(user.dietary_mode, "value") else str(user.dietary_mode),
        "target_calories": user.target_calories,
        "target_protein_g": user.target_protein_g,
        "weight_kg": user.current_weight_kg or 74.0
    }

    sleep_dict = {
        "sleep_date": str(sleep_record.sleep_date),
        "bed_time": sleep_record.bed_time,
        "wake_time": sleep_record.wake_time,
        "duration_hours": sleep_record.duration_hours,
        "deep_sleep_hours": sleep_record.deep_sleep_hours,
        "rem_sleep_hours": sleep_record.rem_sleep_hours,
        "quality_rating": sleep_record.quality_rating,
        "notes": sleep_record.notes
    }

    # API ключ: из тела запроса, хедера или переменной окружения
    effective_key = payload.api_key or x_gemini_key

    # Вызов Gemini сервиса
    analysis_result = await analyze_sleep_with_gemini(
        user_context=user_context,
        sleep_data=sleep_dict,
        nutrition_data=nutrition_context,
        workout_data=workout_context,
        api_key_override=effective_key
    )

    # Сохраняем в БД
    sleep_record.ai_recovery_score = analysis_result.get("recovery_score", 80)
    sleep_record.ai_verdict = analysis_result.get("verdict", "Анализ завершен")
    sleep_record.ai_analysis_json = json.dumps(analysis_result, ensure_ascii=False)
    db.commit()

    return {
        "status": "success",
        "sleep_id": sleep_record.id,
        "sleep_date": str(sleep_record.sleep_date),
        "analysis": analysis_result
    }
