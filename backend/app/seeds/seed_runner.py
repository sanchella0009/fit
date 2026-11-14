import os
import json
import uuid
from datetime import date, datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Добавляем путь к приложению
import sys
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.models.db_schema import (
    Base, User, UserRole, DietaryMode, Product, TechCard, TechCardIngredient,
    CanteenMenuItem, MealType
)
from app.parsers.tech_card_parser import parse_tech_cards_directory
from app.parsers.menu_parser import parse_full_cycle_menu

DB_PATH = os.path.join(BASE_DIR, "recomp.db")
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DB_PATH}")

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_database(
    tech_cards_dir: str = r"F:\техникум\тех.каты для горохова\тех.карты",
    menu_dir: str = r"F:\техникум\меню"
):
    print(f"--- Инициализация БД: {DATABASE_URL} ---")
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()

    try:
        # 1. Создание базовых пользователей
        if not session.query(User).filter_by(username="admin").first():
            admin_user = User(
                username="admin",
                email="admin@recomp.local",
                hashed_password="pbkdf2_sha256$mock$hashed_admin_password",
                role=UserRole.ADMIN,
                dietary_mode=DietaryMode.DORMITORY,
                webhook_token=str(uuid.uuid4()).replace('-', '')[:32],
                target_calories=2400.0,
                target_protein_g=160.0,
                target_fat_g=75.0,
                target_carbs_g=270.0
            )
            dorm_user = User(
                username="dorm_student",
                email="student@recomp.local",
                hashed_password="pbkdf2_sha256$mock$hashed_student_password",
                role=UserRole.USER,
                dietary_mode=DietaryMode.DORMITORY,
                webhook_token="wh_token_dorm_1234567890abcdef",
                target_calories=2200.0,
                target_protein_g=140.0,
                target_fat_g=65.0,
                target_carbs_g=265.0,
                cycle_start_date=date(2026, 9, 1)
            )
            free_user = User(
                username="free_athlete",
                email="athlete@recomp.local",
                hashed_password="pbkdf2_sha256$mock$hashed_athlete_password",
                role=UserRole.USER,
                dietary_mode=DietaryMode.FREE,
                webhook_token="wh_token_free_0987654321fedcba",
                target_calories=2600.0,
                target_protein_g=180.0,
                target_fat_g=80.0,
                target_carbs_g=290.0
            )
            session.add_all([admin_user, dorm_user, free_user])
            session.commit()
            print("✓ Созданы тестовые пользователи: admin, dorm_student, free_athlete")

        # 2. Загрузка базовых продуктов
        seed_json_path = os.path.join(os.path.dirname(__file__), "seed_products.json")
        if os.path.exists(seed_json_path):
            with open(seed_json_path, "r", encoding="utf-8") as f:
                products_data = json.load(f)
            
            added_prod = 0
            for p in products_data:
                existing = session.query(Product).filter_by(name=p["name"]).first()
                if not existing:
                    prod = Product(
                        name=p["name"],
                        category=p.get("category"),
                        calories_100g=p["calories_100g"],
                        protein_100g=p["protein_100g"],
                        fat_100g=p["fat_100g"],
                        carbs_100g=p["carbs_100g"],
                        piece_weight_g=p.get("piece_weight_g"),
                        piece_name=p.get("piece_name"),
                        is_verified=True,
                        is_custom=False,
                        is_public=True,
                        source="SEED"
                    )
                    session.add(prod)
                    added_prod += 1
            session.commit()
            print(f"✓ Загружено базовых продуктов: {added_prod} (всего в справочнике {session.query(Product).count()})")

        # 3. Загрузка и парсинг техкарт
        tech_cards_map = {} # card_number -> TechCard
        if os.path.exists(tech_cards_dir):
            parsed_cards = parse_tech_cards_directory(tech_cards_dir)
            added_cards = 0
            for cd in parsed_cards:
                c_num = cd["card_number"]
                existing_card = session.query(TechCard).filter_by(card_number=c_num).first()
                if not existing_card:
                    tcard = TechCard(
                        card_number=c_num,
                        title=cd["title"],
                        recipe_source=cd.get("recipe_source"),
                        yield_g=cd["yield_g"],
                        calories_portion=cd["kbzu_portion"]["calories"],
                        protein_portion=cd["kbzu_portion"]["protein"],
                        fat_portion=cd["kbzu_portion"]["fat"],
                        carbs_portion=cd["kbzu_portion"]["carbs"],
                        calories_100g=cd["kbzu_100g"]["calories"],
                        protein_100g=cd["kbzu_100g"]["protein"],
                        fat_100g=cd["kbzu_100g"]["fat"],
                        carbs_100g=cd["kbzu_100g"]["carbs"],
                        cooking_technology=cd.get("cooking_technology"),
                        quality_requirements=cd.get("quality_requirements")
                    )
                    for ing in cd["ingredients"]:
                        tcard.ingredients.append(TechCardIngredient(
                            ingredient_name=ing["name"],
                            brutto_g=ing.get("brutto_g"),
                            netto_g=ing.get("netto_g"),
                            waste_percent=ing.get("waste_percent")
                        ))
                    session.add(tcard)
                    session.flush()
                    tech_cards_map[c_num] = tcard
                    added_cards += 1
                else:
                    tech_cards_map[c_num] = existing_card
            session.commit()
            print(f"✓ Загружено технологических карт: {added_cards} (всего {session.query(TechCard).count()})")
        else:
            # Если папка не найдена, индексируем существующие в БД
            for tc in session.query(TechCard).all():
                tech_cards_map[tc.card_number] = tc

        # 4. Загрузка и парсинг 14-дневного меню столовой
        if os.path.exists(menu_dir):
            cycle_data = parse_full_cycle_menu(menu_dir)
            added_dishes = 0
            linked_dishes = 0

            for day_num, dishes in cycle_data.items():
                for d in dishes:
                    # Попытка линковки с техкартой по card_number_raw
                    linked_card = None
                    c_raw = d.get("card_number_raw")
                    if c_raw:
                        # Проверяем точное совпадение и очищенное
                        clean_c = c_raw.lower().strip()
                        linked_card = tech_cards_map.get(clean_c)
                        if not linked_card:
                            # Попробуем без букв
                            num_only = "".join(filter(str.isdigit, clean_c))
                            if num_only:
                                linked_card = tech_cards_map.get(num_only)

                    existing_item = session.query(CanteenMenuItem).filter_by(
                        day_number=day_num,
                        meal_type=MealType[d["meal_type"]],
                        dish_name=d["dish_name"]
                    ).first()

                    if not existing_item:
                        menu_item = CanteenMenuItem(
                            day_number=day_num,
                            meal_type=MealType[d["meal_type"]],
                            dish_name=d["dish_name"],
                            card_number_raw=c_raw,
                            weight_raw=d["weight_raw"],
                            weight_g=d["weight_g"],
                            tech_card_id=linked_card.id if linked_card else None,
                            protein=d["protein"],
                            fat=d["fat"],
                            carbs=d["carbs"],
                            calories=d["calories"]
                        )
                        session.add(menu_item)
                        added_dishes += 1
                        if linked_card:
                            linked_dishes += 1

            session.commit()
            print(f"✓ Загружено блюд циклического меню: {added_dishes}")
            print(f"✓ Автоматически слинковано с техкартами: {linked_dishes} блюд")

        print("--- База данных успешно наполнена и готова к работе! ---")

    except Exception as e:
        session.rollback()
        print(f"Ошибка сидирования: {e}")
        raise e
    finally:
        session.close()

if __name__ == "__main__":
    seed_database()
