from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import shutil, tempfile, os

from app.models.db_schema import (
    User, CanteenMenuItem, TechCard, MealType, DietaryMode
)
from app.parsers.menu_parser import get_current_cycle_day, parse_menu_day_docx
from app.parsers.tech_card_parser import parse_tech_card_docx
from app.seeds.seed_runner import SessionLocal

router = APIRouter(prefix="/canteen", tags=["Canteen & 14-Day Menu"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/today")
def get_today_menu(
    target_date: Optional[date] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Возвращает меню столовой на сегодня (или переданную дату).
    Автоматически рассчитывает день цикла: ((target_date - cycle_start_date) % 14) + 1.
    """
    check_date = target_date or date.today()
    cycle_start = date(2026, 9, 1)

    if user_id:
        u = db.query(User).filter(User.id == user_id).first()
        if u and u.cycle_start_date:
            cycle_start = u.cycle_start_date

    day_num = get_current_cycle_day(check_date, cycle_start)
    dishes = db.query(CanteenMenuItem).filter(CanteenMenuItem.day_number == day_num).all()

    # Группируем по приемам пищи
    grouped = {
        "BREAKFAST": [],
        "LUNCH": [],
        "AFTERNOON_SNACK": [],
        "DINNER": []
    }

    for d in dishes:
        m_type = d.meal_type.value if hasattr(d.meal_type, "value") else str(d.meal_type)
        if m_type not in grouped:
            grouped[m_type] = []
        grouped[m_type].append({
            "id": d.id,
            "dish_name": d.dish_name,
            "weight_raw": d.weight_raw,
            "weight_g": d.weight_g,
            "card_number_raw": d.card_number_raw,
            "tech_card_id": d.tech_card_id,
            "calories": d.calories,
            "protein": d.protein,
            "fat": d.fat,
            "carbs": d.carbs,
            "has_recipe_details": bool(d.tech_card_id)
        })

    return {
        "date": str(check_date),
        "cycle_day": day_num,
        "cycle_start_date": str(cycle_start),
        "meals": grouped
    }

@router.get("/cycle/{day_number}")
def get_cycle_day_menu(day_number: int, db: Session = Depends(get_db)):
    """Возвращает меню конкретного дня цикла (1..14)"""
    if not (1 <= day_number <= 14):
        raise HTTPException(status_code=400, detail="Номер дня должен быть в диапазоне от 1 до 14")

    dishes = db.query(CanteenMenuItem).filter(CanteenMenuItem.day_number == day_number).all()
    return {
        "cycle_day": day_number,
        "dishes_count": len(dishes),
        "dishes": [
            {
                "id": d.id,
                "meal_type": d.meal_type.value if hasattr(d.meal_type, "value") else str(d.meal_type),
                "dish_name": d.dish_name,
                "weight_raw": d.weight_raw,
                "weight_g": d.weight_g,
                "calories": d.calories,
                "protein": d.protein,
                "fat": d.fat,
                "carbs": d.carbs,
                "tech_card_id": d.tech_card_id
            }
            for d in dishes
        ]
    }

@router.get("/tech-card/{card_id}")
def get_tech_card_details(card_id: int, db: Session = Depends(get_db)):
    """Возвращает полную технологическую карту с граммовками Брутто/Нетто и составом"""
    tc = db.query(TechCard).filter(TechCard.id == card_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Техкарта не найдена")

    return {
        "id": tc.id,
        "card_number": tc.card_number,
        "title": tc.title,
        "recipe_source": tc.recipe_source,
        "yield_g": tc.yield_g,
        "kbzu_portion": {
            "calories": tc.calories_portion,
            "protein": tc.protein_portion,
            "fat": tc.fat_portion,
            "carbs": tc.carbs_portion
        },
        "kbzu_100g": {
            "calories": tc.calories_100g,
            "protein": tc.protein_100g,
            "fat": tc.fat_100g,
            "carbs": tc.carbs_100g
        },
        "ingredients": [
            {
                "name": ing.ingredient_name,
                "brutto_g": ing.brutto_g,
                "netto_g": ing.netto_g,
                "waste_percent": ing.waste_percent
            }
            for ing in tc.ingredients
        ],
        "cooking_technology": tc.cooking_technology,
        "quality_requirements": tc.quality_requirements
    }
