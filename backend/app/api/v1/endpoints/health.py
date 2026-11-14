import datetime as dt
import plistlib
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.models.db_schema import User, HealthSyncMetric, BodyMeasurement, SleepLog
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
    sleep_hours: Optional[float] = Field(default=None, description="Часы сна (опционально)")
    deep_sleep_hours: Optional[float] = Field(default=None, description="Часы глубокого сна (опционально)")
    source: Optional[str] = Field(default="APPLE_SHORTCUT", description="Источник (Apple Shortcuts, Android)")

    model_config = {
        "populate_by_name": True
    }

def generate_apple_shortcut_plist(webhook_token: str) -> dict:
    """Генерирует словарь манифеста Apple Shortcut (.shortcut)"""
    return {
        "WFWorkflowMinimumClientVersion": 900,
        "WFWorkflowMinimumClientVersionString": "900",
        "WFWorkflowClientVersion": "2103.0.3",
        "WFWorkflowIcon": {
            "WFWorkflowIconGlyphNumber": 59685,
            "WFWorkflowIconStartColor": 4282601983
        },
        "WFWorkflowActions": [
            {
                "WFWorkflowActionIdentifier": "is.workflow.actions.health.quantity.day",
                "WFWorkflowActionParameters": {
                    "WFQuantityType": "HKQuantityTypeIdentifierStepCount",
                    "UUID": "ACTION_STEPS"
                }
            },
            {
                "WFWorkflowActionIdentifier": "is.workflow.actions.health.quantity.day",
                "WFWorkflowActionParameters": {
                    "WFQuantityType": "HKQuantityTypeIdentifierActiveEnergyBurned",
                    "UUID": "ACTION_CALORIES"
                }
            },
            {
                "WFWorkflowActionIdentifier": "is.workflow.actions.url",
                "WFWorkflowActionParameters": {
                    "WFURLActionURL": "https://fit.sanchella.ru/api/v1/health/sync",
                    "UUID": "ACTION_URL"
                }
            },
            {
                "WFWorkflowActionIdentifier": "is.workflow.actions.downloadurl",
                "WFWorkflowActionParameters": {
                    "WFHTTPMethod": "POST",
                    "WFHTTPHeaders": {
                        "Value": {
                            "WFDictionaryFieldValueItems": [
                                {
                                    "WFItemType": 0,
                                    "WFKey": {"Value": {"string": "Authorization"}},
                                    "WFValue": {"Value": {"string": f"Bearer {webhook_token}"}}
                                },
                                {
                                    "WFItemType": 0,
                                    "WFKey": {"Value": {"string": "Content-Type"}},
                                    "WFValue": {"Value": {"string": "application/json"}}
                                }
                            ]
                        }
                    },
                    "WFHTTPBodyType": "JSON",
                    "WFJSONValues": {
                        "Value": {
                            "WFDictionaryFieldValueItems": [
                                {
                                    "WFItemType": 0,
                                    "WFKey": {"Value": {"string": "source"}},
                                    "WFValue": {"Value": {"string": "APPLE_HEALTH"}}
                                }
                            ]
                        }
                    }
                }
            }
        ]
    }

@router.post("/sync")
def sync_health_webhook(
    payload: HealthSyncPayload,
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None, description="Опциональный токен через Query параметр для 1-клик вебхука"),
    db: Session = Depends(get_db)
):
    """
    Эндпоинт вебхука для фоновой синхронизации из Apple Shortcuts или Android Health Connect.
    Авторизация: Header 'Authorization: Bearer <webhook_token>' или Query '?token=<webhook_token>'
    """
    auth_token = None
    if authorization and authorization.startswith("Bearer "):
        auth_token = authorization.split(" ")[1].strip()
    elif token:
        auth_token = token.strip()

    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется Bearer токен вебхука (Authorization: Bearer <webhook_token> или ?token=...)"
        )

    user = db.query(User).filter(User.webhook_token == auth_token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Неверный webhook_token"
        )

    target_date = payload.sync_date

    # 1. Шаги и активные калории
    metric = db.query(HealthSyncMetric).filter(
        HealthSyncMetric.user_id == user.id,
        HealthSyncMetric.date == target_date
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
            date=target_date,
            steps=payload.steps or 0,
            active_calories=payload.active_calories or 0.0,
            source=payload.source or "APPLE_SHORTCUT"
        )
        db.add(metric)

    # 2. Вес тела (если передан)
    if payload.weight_kg is not None and payload.weight_kg > 0:
        measurement = db.query(BodyMeasurement).filter(
            BodyMeasurement.user_id == user.id,
            BodyMeasurement.date == target_date
        ).first()

        if measurement:
            measurement.weight_kg = payload.weight_kg
        else:
            measurement = BodyMeasurement(
                user_id=user.id,
                date=target_date,
                weight_kg=payload.weight_kg,
                notes=f"Автоматический замер из {payload.source}"
            )
            db.add(measurement)

    # 3. Сон (если передан)
    if payload.sleep_hours is not None and payload.sleep_hours > 0:
        sleep_log = db.query(SleepLog).filter(
            SleepLog.user_id == user.id,
            SleepLog.sleep_date == target_date
        ).first()

        if sleep_log:
            sleep_log.duration_hours = payload.sleep_hours
            if payload.deep_sleep_hours:
                sleep_log.deep_sleep_hours = payload.deep_sleep_hours
        else:
            sleep_log = SleepLog(
                user_id=user.id,
                sleep_date=target_date,
                bed_time="23:30",
                wake_time="07:30",
                duration_hours=payload.sleep_hours,
                deep_sleep_hours=payload.deep_sleep_hours or 1.8,
                rem_sleep_hours=1.5,
                quality_rating=4,
                notes=f"Автоматическая синхронизация сна из {payload.source}"
            )
            db.add(sleep_log)

    db.commit()

    return {
        "status": "success",
        "synced_date": str(target_date),
        "steps": payload.steps,
        "active_calories": payload.active_calories,
        "weight_kg": payload.weight_kg,
        "sleep_hours": payload.sleep_hours
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
    ).order_by(HealthSyncMetric.date.desc()).limit(days).all()

    return [
        {
            "date": str(m.date),
            "steps": m.steps,
            "active_calories": m.active_calories,
            "source": m.source
        }
        for m in metrics
    ]

@router.get("/shortcut/download")
def download_apple_shortcut(
    token: str = Query(..., description="Webhook token пользователя"),
    db: Session = Depends(get_db)
):
    """
    Генерирует и отдает готовый файл команды Apple Shortcuts (.shortcut)
    для добавления автоматизации в один клик.
    """
    user = db.query(User).filter(User.webhook_token == token).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь с таким webhook_token не найден")

    shortcut_dict = generate_apple_shortcut_plist(token)
    binary_content = plistlib.dumps(shortcut_dict, fmt=plistlib.FMT_BINARY)

    return Response(
        content=binary_content,
        media_type="application/x-apple-aspen-config",
        headers={
            "Content-Disposition": 'attachment; filename="FitSync.shortcut"',
            "Cache-Control": "no-cache"
        }
    )
