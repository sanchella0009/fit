from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.models.db_schema import (
    WorkoutTemplate, WorkoutTemplateExercise, WorkoutLog, WorkoutSetLog,
    WorkoutType, User
)
from app.seeds.seed_runner import SessionLocal

router = APIRouter(prefix="/workouts", tags=["Workouts & Progression"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic Models
class ExerciseCreate(BaseModel):
    exercise_name: str
    target_sets: int = 3
    target_reps: int = 10
    default_weight_kg: float = 0.0

class TemplateCreate(BaseModel):
    user_id: int
    title: str
    workout_type: WorkoutType = WorkoutType.STRENGTH
    notes: Optional[str] = None
    exercises: List[ExerciseCreate] = []

class SetLogCreate(BaseModel):
    exercise_name: str
    set_number: int
    weight_kg: float
    reps: int
    is_completed: bool = True

class WorkoutLogCreate(BaseModel):
    user_id: int
    workout_date: date = Field(default_factory=date.today)
    template_id: Optional[int] = None
    title: str
    workout_type: WorkoutType = WorkoutType.STRENGTH
    duration_minutes: int = 45
    active_calories_burned: float = 300.0
    notes: Optional[str] = None
    sets: List[SetLogCreate] = []

DEFAULT_TEMPLATES = [
  {
    "title": "Силовая: Грудь, Плечи, Трицепс",
    "workout_type": WorkoutType.STRENGTH,
    "notes": "Базовая тренировка для набора мышечной массы и рекомпозиции",
    "exercises": [
      { "exercise_name": "Жим штанги лежа", "target_sets": 4, "target_reps": 8, "default_weight_kg": 60.0 },
      { "exercise_name": "Жим гантелей на наклонной скамье", "target_sets": 3, "target_reps": 10, "default_weight_kg": 20.0 },
      { "exercise_name": "Армейский жим стоя", "target_sets": 3, "target_reps": 10, "default_weight_kg": 35.0 },
      { "exercise_name": "Махи гантелей в стороны", "target_sets": 4, "target_reps": 12, "default_weight_kg": 8.0 },
      { "exercise_name": "Французский жим / Разгибания на блоке", "target_sets": 3, "target_reps": 12, "default_weight_kg": 25.0 }
    ]
  },
  {
    "title": "Силовая: Спина, Бицепс, Пресс",
    "workout_type": WorkoutType.STRENGTH,
    "notes": "Тяговый день для рельефа и осанки",
    "exercises": [
      { "exercise_name": "Подтягивания широким хватом", "target_sets": 4, "target_reps": 8, "default_weight_kg": 0.0 },
      { "exercise_name": "Тяга штанги в наклоне", "target_sets": 4, "target_reps": 10, "default_weight_kg": 50.0 },
      { "exercise_name": "Тяга верхнего блока к груди", "target_sets": 3, "target_reps": 12, "default_weight_kg": 55.0 },
      { "exercise_name": "Подъем штанги на бицепс", "target_sets": 3, "target_reps": 10, "default_weight_kg": 30.0 },
      { "exercise_name": "Скручивания на пресс / Планка", "target_sets": 3, "target_reps": 20, "default_weight_kg": 0.0 }
    ]
  },
  {
    "title": "Физкультура техникума / ОФП",
    "workout_type": WorkoutType.PHYSICAL_EDUCATION,
    "notes": "Академическая физкультура, разминка, нормативные упражнения",
    "exercises": [
      { "exercise_name": "Бег на 1000м / 2000м", "target_sets": 1, "target_reps": 1, "default_weight_kg": 0.0 },
      { "exercise_name": "Челночный бег 3x10м", "target_sets": 3, "target_reps": 1, "default_weight_kg": 0.0 },
      { "exercise_name": "Отжимания от пола", "target_sets": 3, "target_reps": 25, "default_weight_kg": 0.0 },
      { "exercise_name": "Подтягивания на перекладине", "target_sets": 3, "target_reps": 10, "default_weight_kg": 0.0 }
    ]
  },
  {
    "title": "Кардио & Степ (Сжигание жира)",
    "workout_type": WorkoutType.CARDIO,
    "notes": "Ходьба на дорожке с уклоном или лестничный тренажер",
    "exercises": [
      { "exercise_name": "Ходьба на дорожке в горку (уклон 12%, 5.5 км/ч)", "target_sets": 1, "target_reps": 40, "default_weight_kg": 0.0 },
      { "exercise_name": "Степпер / Подъемы по лестнице", "target_sets": 1, "target_reps": 20, "default_weight_kg": 0.0 }
    ]
  }
]

@router.get("/templates")
def get_workout_templates(user_id: int, db: Session = Depends(get_db)):
    """Возвращает шаблоны тренировок пользователя или дефолтные программы"""
    user_templates = db.query(WorkoutTemplate).filter(WorkoutTemplate.user_id == user_id).all()
    
    if not user_templates:
        # Если у пользователя нет личных шаблонов, возвращаем стартовый набор программ
        return DEFAULT_TEMPLATES

    res = []
    for t in user_templates:
        res.append({
            "id": t.id,
            "title": t.title,
            "workout_type": t.workout_type.value,
            "notes": t.notes,
            "exercises": [
                {
                    "exercise_name": e.exercise_name,
                    "target_sets": e.target_sets,
                    "target_reps": e.target_reps,
                    "default_weight_kg": e.default_weight_kg
                }
                for e in t.exercises
            ]
        })
    return res

@router.post("/templates", status_code=status.HTTP_201_CREATED)
def create_workout_template(payload: TemplateCreate, db: Session = Depends(get_db)):
    """Создание персонального шаблона тренировки"""
    template = WorkoutTemplate(
        user_id=payload.user_id,
        title=payload.title,
        workout_type=payload.workout_type,
        notes=payload.notes
    )
    for idx, e in enumerate(payload.exercises):
        template.exercises.append(WorkoutTemplateExercise(
            exercise_name=e.exercise_name,
            order_index=idx,
            target_sets=e.target_sets,
            target_reps=e.target_reps,
            default_weight_kg=e.default_weight_kg
        ))
    db.add(template)
    db.commit()
    db.refresh(template)
    return {"status": "created", "template_id": template.id, "title": template.title}

@router.post("/logs", status_code=status.HTTP_201_CREATED)
def log_workout(payload: WorkoutLogCreate, db: Session = Depends(get_db)):
    """Запись выполненной тренировки с подходами и повторениями"""
    workout = WorkoutLog(
        user_id=payload.user_id,
        date=payload.workout_date,
        template_id=payload.template_id,
        title=payload.title,
        workout_type=payload.workout_type,
        duration_minutes=payload.duration_minutes,
        active_calories_burned=payload.active_calories_burned,
        notes=payload.notes
    )
    for s in payload.sets:
        workout.sets.append(WorkoutSetLog(
            exercise_name=s.exercise_name,
            set_number=s.set_number,
            weight_kg=s.weight_kg,
            reps=s.reps,
            is_completed=s.is_completed
        ))
    db.add(workout)
    db.commit()
    db.refresh(workout)

    return {
        "status": "logged",
        "workout_id": workout.id,
        "title": workout.title,
        "total_sets": len(workout.sets),
        "calories_burned": workout.active_calories_burned
    }

@router.get("/history")
def get_workout_history(user_id: int, limit: int = 14, db: Session = Depends(get_db)):
    """История тренировок пользователя"""
    logs = db.query(WorkoutLog).filter(
        WorkoutLog.user_id == user_id
    ).order_by(WorkoutLog.date.desc()).limit(limit).all()

    return [
        {
            "id": l.id,
            "date": str(l.date),
            "title": l.title,
            "workout_type": l.workout_type.value,
            "duration_minutes": l.duration_minutes,
            "active_calories_burned": l.active_calories_burned,
            "sets_count": len(l.sets),
            "sets": [
                {
                    "exercise_name": s.exercise_name,
                    "set_number": s.set_number,
                    "weight_kg": s.weight_kg,
                    "reps": s.reps
                }
                for s in l.sets
            ]
        }
        for l in logs
    ]

@router.get("/previous-exercise-set/{exercise_name}")
def get_previous_exercise_set(exercise_name: str, user_id: int, db: Session = Depends(get_db)):
    """Возвращает прошлый лучший подход для прогрессии нагрузок (+1 повтор / +вес)"""
    last_set = db.query(WorkoutSetLog).join(WorkoutLog).filter(
        WorkoutLog.user_id == user_id,
        WorkoutSetLog.exercise_name.ilike(f"%{exercise_name}%"),
        WorkoutSetLog.is_completed == True
    ).order_by(WorkoutLog.date.desc(), WorkoutSetLog.weight_kg.desc()).first()

    if not last_set:
        return {"has_history": False, "exercise_name": exercise_name}

    return {
        "has_history": True,
        "exercise_name": last_set.exercise_name,
        "last_weight_kg": last_set.weight_kg,
        "last_reps": last_set.reps,
        "next_target_reps": last_set.reps + 1,
        "next_target_weight": last_set.weight_kg + 2.5
    }
