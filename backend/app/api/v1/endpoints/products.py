from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.db_schema import Product, User
from app.services.open_food_facts import fetch_product_by_barcode
from app.seeds.seed_runner import SessionLocal

router = APIRouter(prefix="/products", tags=["Products & Open Food Facts"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ProductCreate(BaseModel):
    name: str = Field(..., max_length=200)
    barcode: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = "Свои продукты"
    calories_100g: float
    protein_100g: float = 0.0
    fat_100g: float = 0.0
    carbs_100g: float = 0.0
    piece_weight_g: Optional[float] = None
    piece_name: Optional[str] = "порция"
    is_public: bool = True

@router.get("/search")
def search_products(
    q: str = Query(..., min_length=1, description="Поисковый запрос"),
    category: Optional[str] = None,
    limit: int = 30,
    db: Session = Depends(get_db)
):
    """Поиск по локальному каталогу базовых продуктов и кэшированным товарам"""
    query = db.query(Product).filter(
        or_(
            Product.name.ilike(f"%{q}%"),
            Product.brand.ilike(f"%{q}%")
        )
    )
    if category:
        query = query.filter(Product.category == category)
    
    results = query.limit(limit).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "brand": p.brand,
            "category": p.category,
            "barcode": p.barcode,
            "calories_100g": p.calories_100g,
            "protein_100g": p.protein_100g,
            "fat_100g": p.fat_100g,
            "carbs_100g": p.carbs_100g,
            "piece_weight_g": p.piece_weight_g,
            "piece_name": p.piece_name,
            "is_verified": p.is_verified,
            "source": p.source
        }
        for p in results
    ]

@router.get("/barcode/{barcode}")
async def get_by_barcode(barcode: str, db: Session = Depends(get_db)):
    """Поиск по штрихкоду с автоматическим обращением в бесплатный Open Food Facts"""
    prod = await fetch_product_by_barcode(barcode, db)
    if not prod:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Продукт со штрихкодом {barcode} не найден ни в локальной базе, ни в Open Food Facts"
        )
    return prod

@router.post("", status_code=status.HTTP_201_CREATED)
def create_custom_product(
    payload: ProductCreate,
    user_id: int = Query(..., description="ID пользователя"),
    db: Session = Depends(get_db)
):
    """Создание личного продукта пользователем"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    new_prod = Product(
        name=payload.name,
        barcode=payload.barcode,
        brand=payload.brand,
        category=payload.category,
        calories_100g=payload.calories_100g,
        protein_100g=payload.protein_100g,
        fat_100g=payload.fat_100g,
        carbs_100g=payload.carbs_100g,
        piece_weight_g=payload.piece_weight_g,
        piece_name=payload.piece_name,
        is_verified=False,
        is_custom=True,
        created_by_user_id=user.id,
        is_public=payload.is_public,
        source="USER_CUSTOM"
    )
    db.add(new_prod)
    db.commit()
    db.refresh(new_prod)
    return {"status": "created", "product_id": new_prod.id, "name": new_prod.name}
