from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.models.db_schema import (
    FoodLog, User, Product, TechCard, CanteenMenuItem, UserRecipe,
    MealType, FoodEntryType
)
from app.seeds.seed_runner import SessionLocal

router = APIRouter(prefix="/food-logs", tags=["Food Diary & Daily Progress"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class LogEntryCreate(BaseModel):
    user_id: int
    log_date: date = Field(default_factory=date.today)
    meal_type: MealType
    entry_type: FoodEntryType

    product_id: Optional[int] = None
    tech_card_id: Optional[int] = None
    canteen_menu_item_id: Optional[int] = None
    recipe_id: Optional[int] = None

    custom_title: Optional[str] = None
    portion_multiplier: float = Field(default=1.0, description="Множитель для столовой (0.5, 1.0, 1.5, 2.0)")
    amount_g: Optional[float] = Field(default=None, description="Вес в граммах")
    
    # Прямой ввод калорий при ручном CUSTOM вводе
    custom_calories: Optional[float] = None
    custom_protein: Optional[float] = None
    custom_fat: Optional[float] = None
    custom_carbs: Optional[float] = None

@router.post("", status_code=status.HTTP_201_CREATED)
def add_food_log_entry(payload: LogEntryCreate, db: Session = Depends(get_db)):
    """
    Добавляет блюдо/продукт в дневник питания:
    - Для режима «Общежитие»: выбор блюда столовой (canteen_menu_item_id) с множителем (0.5x, 1x, 1.5x, 2x).
    - Для режима «Свободный»: выбор продукта (product_id) или рецепта (recipe_id) с граммовкой.
    """
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    title = payload.custom_title or "Прием пищи"
    amount = payload.amount_g or 100.0
    cal = 0.0
    prot = 0.0
    fat = 0.0
    carbs = 0.0

    # 1. Если выбрано блюдо из меню столовой
    if payload.entry_type == FoodEntryType.CANTEEN_DISH and payload.canteen_menu_item_id:
        canteen_item = db.query(CanteenMenuItem).filter(CanteenMenuItem.id == payload.canteen_menu_item_id).first()
        if not canteen_item:
            raise HTTPException(status_code=404, detail="Пункт меню столовой не найден")
        
        mult = payload.portion_multiplier
        title = canteen_item.dish_name
        amount = canteen_item.weight_g * mult
        cal = canteen_item.calories * mult
        prot = canteen_item.protein * mult
        fat = canteen_item.fat * mult
        carbs = canteen_item.carbs * mult

    # 2. Если выбран базовый/пользовательский продукт
    elif payload.entry_type == FoodEntryType.PRODUCT and payload.product_id:
        prod = db.query(Product).filter(Product.id == payload.product_id).first()
        if not prod:
            raise HTTPException(status_code=404, detail="Продукт не найден")
        
        title = prod.name
        ratio = amount / 100.0
        cal = round(prod.calories_100g * ratio, 1)
        prot = round(prod.protein_100g * ratio, 1)
        fat = round(prod.fat_100g * ratio, 1)
        carbs = round(prod.carbs_100g * ratio, 1)

    # 3. Если выбрана техкарта напрямую
    elif payload.entry_type == FoodEntryType.TECH_CARD and payload.tech_card_id:
        tc = db.query(TechCard).filter(TechCard.id == payload.tech_card_id).first()
        if not tc:
            raise HTTPException(status_code=404, detail="Техкарта не найдена")
        
        title = tc.title
        mult = payload.portion_multiplier
        amount = tc.yield_g * mult
        cal = round(tc.calories_portion * mult, 1)
        prot = round(tc.protein_portion * mult, 1)
        fat = round(tc.fat_portion * mult, 1)
        carbs = round(tc.carbs_portion * mult, 1)

    # 4. Ручной ввод
    elif payload.entry_type == FoodEntryType.CUSTOM:
        cal = payload.custom_calories or 0.0
        prot = payload.custom_protein or 0.0
        fat = payload.custom_fat or 0.0
        carbs = payload.custom_carbs or 0.0

    entry = FoodLog(
        user_id=user.id,
        log_date=payload.log_date,
        meal_type=payload.meal_type,
        entry_type=payload.entry_type,
        product_id=payload.product_id,
        tech_card_id=payload.tech_card_id,
        recipe_id=payload.recipe_id,
        canteen_menu_item_id=payload.canteen_menu_item_id,
        title_snapshot=title,
        portion_multiplier=payload.portion_multiplier,
        amount_g=amount,
        calories=cal,
        protein=prot,
        fat=fat,
        carbs=carbs
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return {
        "status": "added",
        "entry_id": entry.id,
        "title": entry.title_snapshot,
        "amount_g": entry.amount_g,
        "calories": entry.calories,
        "protein": entry.protein,
        "fat": entry.fat,
        "carbs": entry.carbs
    }

@router.get("/day-dashboard")
def get_daily_dashboard(
    user_id: int,
    target_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """
    Возвращает сводку питания за день:
    - Фактически съедено (ккал, белки, жиры, углеводы)
    - Индивидуальные целевые показатели пользователя
    - Процент достижения целей прогресс-баров
    - Список записей по каждому приему пищи
    """
    check_date = target_date or date.today()
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    logs = db.query(FoodLog).filter(
        FoodLog.user_id == user.id,
        FoodLog.log_date == check_date
    ).all()

    meals = {
        "BREAKFAST": [],
        "LUNCH": [],
        "AFTERNOON_SNACK": [],
        "DINNER": [],
        "SNACK": []
    }

    tot_cal = 0.0
    tot_prot = 0.0
    tot_fat = 0.0
    tot_carbs = 0.0

    for l in logs:
        m_key = l.meal_type.value if hasattr(l.meal_type, "value") else str(l.meal_type)
        if m_key not in meals:
            meals[m_key] = []
        meals[m_key].append({
            "id": l.id,
            "title": l.title_snapshot,
            "amount_g": l.amount_g,
            "multiplier": l.portion_multiplier,
            "calories": l.calories,
            "protein": l.protein,
            "fat": l.fat,
            "carbs": l.carbs,
            "entry_type": l.entry_type.value if hasattr(l.entry_type, "value") else str(l.entry_type)
        })
        tot_cal += l.calories
        tot_prot += l.protein
        tot_fat += l.fat
        tot_carbs += l.carbs

    return {
        "user_id": user.id,
        "date": str(check_date),
        "dietary_mode": user.dietary_mode.value if hasattr(user.dietary_mode, "value") else str(user.dietary_mode),
        "consumed": {
            "calories": round(tot_cal, 1),
            "protein_g": round(tot_prot, 1),
            "fat_g": round(tot_fat, 1),
            "carbs_g": round(tot_carbs, 1)
        },
        "target": {
            "calories": user.target_calories,
            "protein_g": user.target_protein_g,
            "fat_g": user.target_fat_g,
            "carbs_g": user.target_carbs_g
        },
        "progress_percent": {
            "calories": round((tot_cal / user.target_calories * 100), 1) if user.target_calories else 0,
            "protein": round((tot_prot / user.target_protein_g * 100), 1) if user.target_protein_g else 0,
            "fat": round((tot_fat / user.target_fat_g * 100), 1) if user.target_fat_g else 0,
            "carbs": round((tot_carbs / user.target_carbs_g * 100), 1) if user.target_carbs_g else 0
        },
        "meals": meals
    }

@router.delete("/{entry_id}")
def delete_log_entry(entry_id: int, user_id: int, db: Session = Depends(get_db)):
    """Удаляет запись из дневника питания"""
    entry = db.query(FoodLog).filter(FoodLog.id == entry_id, FoodLog.user_id == user_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    db.delete(entry)
    db.commit()
    return {"status": "deleted", "entry_id": entry_id}
