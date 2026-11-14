from datetime import date, datetime
import enum
from typing import Optional, List
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Date, DateTime,
    ForeignKey, Text, Enum, UniqueConstraint, Index
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    USER = "USER"

class DietaryMode(str, enum.Enum):
    DORMITORY = "DORMITORY"  # Режим «Общежитие» (столовая по циклу 14 дней + допы)
    FREE = "FREE"            # Режим «Свободный» (конструктор блюд и личная готовка)

class MealType(str, enum.Enum):
    BREAKFAST = "BREAKFAST"
    LUNCH = "LUNCH"
    AFTERNOON_SNACK = "AFTERNOON_SNACK"
    DINNER = "DINNER"
    LATE_DINNER = "LATE_DINNER"  # Второй ужин / Вечерний ужин (кефир, батон перед сном)
    SNACK = "SNACK"

class FoodEntryType(str, enum.Enum):
    PRODUCT = "PRODUCT"              # Базовый продукт из справочника
    TECH_CARD = "TECH_CARD"          # Блюдо из столовой / техкарты
    RECIPE = "RECIPE"                # Личный составной рецепт
    CANTEEN_DISH = "CANTEEN_DISH"    # Пункт расписания столовой
    CUSTOM = "CUSTOM"                # Ручной быстрый ввод

class WorkoutType(str, enum.Enum):
    STRENGTH = "STRENGTH"
    CARDIO = "CARDIO"
    STEP = "STEP"
    PHYSICAL_EDUCATION = "PHYSICAL_EDUCATION"
    OTHER = "OTHER"

# ----------------- 1. ПОЛЬЗОВАТЕЛИ И ПРОФИЛЬ -----------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    dietary_mode = Column(Enum(DietaryMode), default=DietaryMode.DORMITORY, nullable=False)
    
    # Персональный токен для iOS Shortcuts / Android Tasker / Health Connect
    webhook_token = Column(String(64), unique=True, nullable=False, index=True)

    # Параметры рекомпозиции и цели КБЖУ
    cycle_start_date = Column(Date, default=date(2026, 9, 1), nullable=False)
    gender = Column(String(10), default="MALE")  # MALE, FEMALE
    birth_date = Column(Date, nullable=True)
    height_cm = Column(Float, nullable=True)
    current_weight_kg = Column(Float, nullable=True)
    target_calories = Column(Float, default=2200.0, nullable=False)
    target_protein_g = Column(Float, default=150.0, nullable=False)
    target_fat_g = Column(Float, default=70.0, nullable=False)
    target_carbs_g = Column(Float, default=240.0, nullable=False)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Связи
    food_logs = relationship("FoodLog", back_populates="user", cascade="all, delete-orphan")
    custom_products = relationship("Product", back_populates="creator")
    recipes = relationship("UserRecipe", back_populates="user", cascade="all, delete-orphan")
    health_metrics = relationship("HealthSyncMetric", back_populates="user", cascade="all, delete-orphan")
    workouts = relationship("WorkoutLog", back_populates="user", cascade="all, delete-orphan")
    workout_templates = relationship("WorkoutTemplate", back_populates="user", cascade="all, delete-orphan")
    measurements = relationship("BodyMeasurement", back_populates="user", cascade="all, delete-orphan")
    progress_photos = relationship("BodyProgressPhoto", back_populates="user", cascade="all, delete-orphan")
    sleep_logs = relationship("SleepLog", back_populates="user", cascade="all, delete-orphan")

# ----------------- 2. ПРОДУКТЫ И OPEN FOOD FACTS -----------------
class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    barcode = Column(String(32), unique=True, nullable=True, index=True) # Штрихкод Open Food Facts / локальный
    brand = Column(String(100), nullable=True)
    category = Column(String(100), nullable=True, index=True)
    
    # КБЖУ на 100 г
    calories_100g = Column(Float, nullable=False)
    protein_100g = Column(Float, default=0.0, nullable=False)
    fat_100g = Column(Float, default=0.0, nullable=False)
    carbs_100g = Column(Float, default=0.0, nullable=False)
    fiber_100g = Column(Float, default=0.0)

    # Вес единицы/штуки (например, 1 шт яйцо = 55 г, 1 ломтик хлеба = 30 г)
    piece_weight_g = Column(Float, nullable=True)
    piece_name = Column(String(50), nullable=True) # "шт", "ломтик", "мерная ложка"

    is_verified = Column(Boolean, default=False) # True для официального сида и модерации
    is_custom = Column(Boolean, default=False)   # True для продуктов, добавленных пользователем
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_public = Column(Boolean, default=True)    # Доступен ли продукт друзьям/всем
    source = Column(String(50), default="SEED")  # SEED, OPEN_FOOD_FACTS, USER_CUSTOM

    created_at = Column(DateTime, default=datetime.utcnow)

    creator = relationship("User", back_populates="custom_products")

# ----------------- 3. ТЕХКАРТЫ И МЕНЮ СТОЛОВОЙ -----------------
class TechCard(Base):
    __tablename__ = "tech_cards"

    id = Column(Integer, primary_key=True, index=True)
    card_number = Column(String(30), unique=True, nullable=False, index=True) # e.g. "4", "35", "19а"
    title = Column(String(255), nullable=False, index=True)
    recipe_source = Column(String(255), nullable=True) # Сборник Могильного, Тутельяна и т.д.
    
    yield_g = Column(Float, nullable=False) # Выход готового блюда в граммах на 1 порцию
    
    # КБЖУ на 1 порцию
    calories_portion = Column(Float, nullable=False)
    protein_portion = Column(Float, nullable=False)
    fat_portion = Column(Float, nullable=False)
    carbs_portion = Column(Float, nullable=False)

    # КБЖУ пересчитанные на 100 г (для гибкого масштабирования порций)
    calories_100g = Column(Float, nullable=False)
    protein_100g = Column(Float, nullable=False)
    fat_100g = Column(Float, nullable=False)
    carbs_100g = Column(Float, nullable=False)

    cooking_technology = Column(Text, nullable=True)
    quality_requirements = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    ingredients = relationship("TechCardIngredient", back_populates="tech_card", cascade="all, delete-orphan")
    canteen_dishes = relationship("CanteenMenuItem", back_populates="tech_card")

class TechCardIngredient(Base):
    __tablename__ = "tech_card_ingredients"

    id = Column(Integer, primary_key=True, index=True)
    tech_card_id = Column(Integer, ForeignKey("tech_cards.id"), nullable=False, index=True)
    ingredient_name = Column(String(150), nullable=False)
    brutto_g = Column(Float, nullable=True)
    netto_g = Column(Float, nullable=True)
    waste_percent = Column(Float, nullable=True)

    tech_card = relationship("TechCard", back_populates="ingredients")

class CanteenMenuItem(Base):
    __tablename__ = "canteen_menu_items"

    id = Column(Integer, primary_key=True, index=True)
    day_number = Column(Integer, nullable=False, index=True) # 1..14
    meal_type = Column(Enum(MealType), nullable=False, index=True) # BREAKFAST, LUNCH, etc.
    dish_name = Column(String(255), nullable=False)
    card_number_raw = Column(String(50), nullable=True) # Например: "3а", "2", "35"
    weight_raw = Column(String(50), nullable=False)     # "200/10", "150", "100/15"
    weight_g = Column(Float, nullable=False)           # 210.0, 150.0

    # Связь с техкартой при успешной линковке
    tech_card_id = Column(Integer, ForeignKey("tech_cards.id"), nullable=True, index=True)

    # КБЖУ на позицию из таблицы меню
    protein = Column(Float, default=0.0)
    fat = Column(Float, default=0.0)
    carbs = Column(Float, default=0.0)
    calories = Column(Float, default=0.0)

    tech_card = relationship("TechCard", back_populates="canteen_dishes")

    __table_args__ = (
        Index("idx_canteen_day_meal", "day_number", "meal_type"),
    )

# ----------------- 4. РЕЦЕПТЫ ПОЛЬЗОВАТЕЛЕЙ (СОСТАВНЫЕ БЛЮДА) -----------------
class UserRecipe(Base):
    __tablename__ = "user_recipes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    
    total_raw_weight_g = Column(Float, default=0.0)
    cooked_weight_g = Column(Float, nullable=False) # Вес после термообработки
    
    # КБЖУ на 100 г готового блюда
    calories_100g = Column(Float, nullable=False)
    protein_100g = Column(Float, nullable=False)
    fat_100g = Column(Float, nullable=False)
    carbs_100g = Column(Float, nullable=False)

    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="recipes")
    ingredients = relationship("UserRecipeIngredient", back_populates="recipe", cascade="all, delete-orphan")

class UserRecipeIngredient(Base):
    __tablename__ = "user_recipe_ingredients"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("user_recipes.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    custom_name = Column(String(150), nullable=True)
    weight_g = Column(Float, nullable=False)
    
    # Снапшот КБЖУ на момент добавления
    calories = Column(Float, nullable=False)
    protein = Column(Float, nullable=False)
    fat = Column(Float, nullable=False)
    carbs = Column(Float, nullable=False)

    recipe = relationship("UserRecipe", back_populates="ingredients")
    product = relationship("Product")

# ----------------- 5. ЕДИНАЯ СИСТЕМА ЛОГИРОВАНИЯ ПИТАНИЯ -----------------
class FoodLog(Base):
    __tablename__ = "food_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    log_date = Column(Date, nullable=False, index=True)
    meal_type = Column(Enum(MealType), nullable=False, index=True)
    entry_type = Column(Enum(FoodEntryType), nullable=False)

    # Полиморфные внешние ключи (в зависимости от источника)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    tech_card_id = Column(Integer, ForeignKey("tech_cards.id"), nullable=True)
    recipe_id = Column(Integer, ForeignKey("user_recipes.id"), nullable=True)
    canteen_menu_item_id = Column(Integer, ForeignKey("canteen_menu_items.id"), nullable=True)

    # Денормализованный снапшот названия и фактических параметров
    title_snapshot = Column(String(255), nullable=False)
    portion_multiplier = Column(Float, default=1.0) # Для столовой (0.5x, 1x, 1.5x, 2x)
    amount_g = Column(Float, nullable=False)         # Фактический вес порции в граммах
    meal_time = Column(String(10), nullable=True)    # Время приема пищи (например "14:30", время жора)

    # Итоговые рассчитанные КБЖУ данной порции
    calories = Column(Float, nullable=False)
    protein = Column(Float, nullable=False)
    fat = Column(Float, nullable=False)
    carbs = Column(Float, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="food_logs")
    product = relationship("Product")
    tech_card = relationship("TechCard")
    recipe = relationship("UserRecipe")
    canteen_item = relationship("CanteenMenuItem")

    __table_args__ = (
        Index("idx_user_log_date_meal", "user_id", "log_date", "meal_type"),
    )

# ----------------- 6. ТРЕНИРОВКИ И ШАБЛОНЫ -----------------
class WorkoutTemplate(Base):
    __tablename__ = "workout_templates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(100), nullable=False)
    workout_type = Column(Enum(WorkoutType), default=WorkoutType.STRENGTH)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="workout_templates")
    exercises = relationship("WorkoutTemplateExercise", back_populates="template", cascade="all, delete-orphan", order_by="WorkoutTemplateExercise.order_index")

class WorkoutTemplateExercise(Base):
    __tablename__ = "workout_template_exercises"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("workout_templates.id"), nullable=False, index=True)
    exercise_name = Column(String(100), nullable=False)
    order_index = Column(Integer, default=0)
    target_sets = Column(Integer, default=3)
    target_reps = Column(Integer, default=10)
    default_weight_kg = Column(Float, default=0.0)

    template = relationship("WorkoutTemplate", back_populates="exercises")

class WorkoutLog(Base):
    __tablename__ = "workout_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    template_id = Column(Integer, ForeignKey("workout_templates.id"), nullable=True)
    title = Column(String(100), nullable=False)
    workout_type = Column(Enum(WorkoutType), default=WorkoutType.STRENGTH)
    duration_minutes = Column(Integer, default=45)
    active_calories_burned = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="workouts")
    sets = relationship("WorkoutSetLog", back_populates="workout_log", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_user_workout_date", "user_id", "date"),
    )

class WorkoutSetLog(Base):
    __tablename__ = "workout_set_logs"

    id = Column(Integer, primary_key=True, index=True)
    workout_log_id = Column(Integer, ForeignKey("workout_logs.id"), nullable=False, index=True)
    exercise_name = Column(String(100), nullable=False, index=True)
    set_number = Column(Integer, nullable=False)
    weight_kg = Column(Float, nullable=False)
    reps = Column(Integer, nullable=False)
    is_completed = Column(Boolean, default=True)

    workout_log = relationship("WorkoutLog", back_populates="sets")

# ----------------- 7. ВЕБХУКИ ЗДОРОВЬЯ, ШАГИ И ЗАМЕРЫ -----------------
class HealthSyncMetric(Base):
    __tablename__ = "health_sync_metrics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    steps = Column(Integer, default=0)
    active_calories = Column(Float, default=0.0)
    weight_kg = Column(Float, nullable=True)
    source = Column(String(50), default="APPLE_SHORTCUT") # APPLE_SHORTCUT, ANDROID_TASKER, MANUAL
    synced_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="health_metrics")

    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_user_health_date"),
    )

class BodyMeasurement(Base):
    __tablename__ = "body_measurements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    weight_kg = Column(Float, nullable=False)
    waist_cm = Column(Float, nullable=True)
    chest_cm = Column(Float, nullable=True)
    hips_cm = Column(Float, nullable=True)
    bicep_cm = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="measurements")

class BodyProgressPhoto(Base):
    __tablename__ = "body_progress_photos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    photo_path = Column(String(255), nullable=False)
    pose_type = Column(String(20), default="FRONT") # FRONT, SIDE, BACK
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="progress_photos")

# ----------------- 8. СОН И ИИ-АНАЛИЗ ВОССТАНОВЛЕНИЯ (GEMINI AI) -----------------
class SleepLog(Base):
    __tablename__ = "sleep_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    sleep_date = Column(Date, nullable=False, index=True)
    bed_time = Column(String(10), nullable=True) # "23:30"
    wake_time = Column(String(10), nullable=True) # "07:15"
    duration_hours = Column(Float, nullable=False) # 7.75
    deep_sleep_hours = Column(Float, nullable=True) # 1.8
    rem_sleep_hours = Column(Float, nullable=True) # 1.5
    quality_rating = Column(Integer, default=4) # 1..5
    notes = Column(Text, nullable=True)
    
    # Результаты анализа Gemini AI
    ai_recovery_score = Column(Integer, nullable=True) # 0..100
    ai_verdict = Column(String(255), nullable=True)
    ai_analysis_json = Column(Text, nullable=True) # Полный JSON ответ Gemini
    
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sleep_logs")

    __table_args__ = (
        UniqueConstraint("user_id", "sleep_date", name="uq_user_sleep_date"),
    )
