import datetime as dt
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
    sync_date: dt.date = Field(default_factory=dt.date.today, alias="date", description="Дата метрик YYYY-MM-DD")
    steps: Optional[int] = Field(default=0, description="Количество пройденных шагов")
    active_calories: Optional[float] = Field(default=0.0, description="Активные калории (ккал)")
    weight_kg: Optional[float] = Field(default=None, description="Текущий вес тела (кг)")
    source: Optional[str] = Field(default="APPLE_SHORTCUT", description="Источник (Apple Shortcuts, Android)")

    model_config = {
        "populate_by_name": True
    }

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

    target_date = payload.sync_date

    # Ищем существующую запись на эту дату или создаем новую
    metric = db.query(HealthSyncMetric).filter(
        HealthSyncMetric.user_id == user.id,
        HealthSyncMetric.metric_date == target_date
    ).first()

    if metric:
        if payload.steps is not None:
            metric.steps = payload.steps
        if payload.active_calories is not None:
            metric.active_calories = payload.active_calories
        if payload.source:
            metric.source = payload.source
    else:
        metric = HealthSyncMetric(
            user_id=user.id,
            metric_date=target_date,
            steps=payload.steps or 0,
            active_calories=payload.active_calories or 0.0,
            source=payload.source or "APPLE_SHORTCUT"
        )
        db.add(metric)

    # Если передан вес — вносим запись в замеры
    if payload.weight_kg is not None and payload.weight_kg > 0:
        measurement = db.query(BodyMeasurement).filter(
            BodyMeasurement.user_id == user.id,
            BodyMeasurement.measurement_date == target_date
        ).first()

        if measurement:
            measurement.weight_kg = payload.weight_kg
        else:
            measurement = BodyMeasurement(
                user_id=user.id,
                measurement_date=target_date,
                weight_kg=payload.weight_kg,
                notes=f"Автоматический замер из {payload.source}"
            )
            db.add(measurement)

    db.commit()

    return {
        "status": "success",
        "synced_date": str(target_date),
        "steps": payload.steps,
        "active_calories": payload.active_calories,
        "weight_kg": payload.weight_kg
    }

@router.get("/metrics")
def get_user_health_metrics(
    user_id: int,
    days: int = 7,
    db: Session = Depends(get_db)
):
    """Возвращает историю шагов и активности пользователя за N дней"""
    metrics = db.query(HealthSyncMetric).filter(
        HealthSyncMetric.user_id == user_id
    ).order_by(HealthSyncMetric.metric_date.desc()).limit(days).all()

    return [
        {
            "date": str(m.metric_date),
            "steps": m.steps,
            "active_calories": m.active_calories,
            "source": m.source
        }
        for m in metrics
    ]
