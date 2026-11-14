import httpx
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.db_schema import Product

OPEN_FOOD_FACTS_URL = "https://world.openfoodfacts.org/api/v0/product/{barcode}.json"

async def fetch_product_by_barcode(barcode: str, db: Session) -> Optional[Dict[str, Any]]:
    """
    Ищет продукт по штрихкоду:
    1. Сначала в локальной БД (кэш/справочник).
    2. Если нет в локальной БД — запрашивает бесплатный Open Food Facts API.
    3. При успехе автоматически сохраняет товар в локальную БД для быстрого доступа без интернета.
    """
    clean_barcode = barcode.strip()

    # 1. Поиск в локальной БД
    local_product = db.query(Product).filter(Product.barcode == clean_barcode).first()
    if local_product:
        return {
            "id": local_product.id,
            "name": local_product.name,
            "barcode": local_product.barcode,
            "brand": local_product.brand,
            "category": local_product.category,
            "calories_100g": local_product.calories_100g,
            "protein_100g": local_product.protein_100g,
            "fat_100g": local_product.fat_100g,
            "carbs_100g": local_product.carbs_100g,
            "piece_weight_g": local_product.piece_weight_g,
            "source": local_product.source
        }

    # 2. Бесплатный запрос в Open Food Facts API
    url = OPEN_FOOD_FACTS_URL.format(barcode=clean_barcode)
    headers = {"User-Agent": "RecompPWA - BodyRecompositionApp - StudentVersion 1.0"}

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                return None
            data = resp.json()

        if data.get("status") != 1:
            return None

        p_data = data.get("product", {})
        nutriments = p_data.get("nutriments", {})

        # Извлечение названия и бренда
        product_name = p_data.get("product_name_ru") or p_data.get("product_name") or "Неизвестный продукт"
        brand = p_data.get("brands")

        # Энергетическая ценность
        calories = (
            nutriments.get("energy-kcal_100g") or
            nutriments.get("energy-kcal") or
            (nutriments.get("energy_100g", 0) / 4.184) or 0.0
        )
        protein = nutriments.get("proteins_100g") or nutriments.get("proteins") or 0.0
        fat = nutriments.get("fat_100g") or nutriments.get("fat") or 0.0
        carbs = nutriments.get("carbohydrates_100g") or nutriments.get("carbohydrates") or 0.0

        # Кэширование в локальную базу данных
        new_prod = Product(
            name=product_name[:200],
            barcode=clean_barcode,
            brand=brand[:100] if brand else None,
            category="Open Food Facts",
            calories_100g=round(float(calories), 1),
            protein_100g=round(float(protein), 1),
            fat_100g=round(float(fat), 1),
            carbs_100g=round(float(carbs), 1),
            is_verified=False,
            is_custom=False,
            is_public=True,
            source="OPEN_FOOD_FACTS"
        )
        db.add(new_prod)
        db.commit()
        db.refresh(new_prod)

        return {
            "id": new_prod.id,
            "name": new_prod.name,
            "barcode": new_prod.barcode,
            "brand": new_prod.brand,
            "category": new_prod.category,
            "calories_100g": new_prod.calories_100g,
            "protein_100g": new_prod.protein_100g,
            "fat_100g": new_prod.fat_100g,
            "carbs_100g": new_prod.carbs_100g,
            "piece_weight_g": None,
            "source": "OPEN_FOOD_FACTS"
        }

    except Exception as e:
        print(f"Ошибка запроса в Open Food Facts для {barcode}: {e}")
        return None
