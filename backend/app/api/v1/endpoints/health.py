from datetime import date
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.models.db_schema import User, HealthSyncMetric, BodyMeasurement
from app.seeds.seed_runner import SessionLocal

router = APIRouter(prefix="/health", tags=["Health & Shortcuts Sync"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class HealthSyncPayload(BaseModel):
    date: date = Field(default_factory=date.today, description="Дата метрик YYYY-MM-DD")
    steps: Optional[int] = Field(default=0, description="Количество пройденных шагов")
    active_calories: Optional[float] = Field(default=0.0, description="Активные калории (ккал)")
    weight_kg: Optional[float] = Field(default=None, description="Текущий вес тела (кг)")
    source: Optional[str] = Field(default="APPLE_SHORTCUT", description="Источник (Apple Shortcuts, Android)")

@router.post("/sync")
def sync_health_webhook(
    payload: HealthSyncPayload,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Эндпоинт вебхука для фоновой синхронизации из Apple Shortcuts или Android Health Connect.
    Авторизация: Header 'Authorization: Bearer <webhook_token>'
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется Bearer токен вебхука (Authorization: Bearer <webhook_token>)"
        )

    token = authorization.split(" ")[1].strip()
    user = db.query(User).filter(User.webhook_token == token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Неверный webhook_token"
        )

    # Ищем существующую запись на эту дату или создаем новую
    metric = db.query(HealthSyncMetric).filter(
        HealthSyncMetric.user_id == user.id,
        HealthSyncMetric.date == payload.date
    ).first()

    if not metric:
        metric = HealthSyncMetric(
            user_id=user.id,
            date=payload.date,
            steps=payload.steps or 0,
            active_calories=payload.active_calories or 0.0,
            weight_kg=payload.weight_kg,
            source=payload.source or "APPLE_SHORTCUT"
        )
        db.add(metric)
    else:
        # Обновляем метрики
        if payload.steps:
            metric.steps = payload.steps
        if payload.active_calories:
            metric.active_calories = payload.active_calories
        if payload.weight_kg:
            metric.weight_kg = payload.weight_kg
        metric.source = payload.source or metric.source

    # Если передан вес — обновляем текущий вес пользователя и журнал замеров
    if payload.weight_kg and payload.weight_kg > 0:
        user.current_weight_kg = payload.weight_kg
        measurement = db.query(BodyMeasurement).filter(
            BodyMeasurement.user_id == user.id,
            BodyMeasurement.date == payload.date
        ).first()
        if not measurement:
            measurement = BodyMeasurement(
                user_id=user.id,
                date=payload.date,
                weight_kg=payload.weight_kg,
                notes=f"Автоматическая синхронизация ({payload.source})"
            )
            db.add(measurement)
        else:
            measurement.weight_kg = payload.weight_kg

    db.commit()
    db.refresh(metric)

    return {
        "status": "success",
        "synced_for_user": user.username,
        "date": str(metric.date),
        "steps": metric.steps,
        "active_calories": metric.active_calories,
        "weight_kg": metric.weight_kg
    }
