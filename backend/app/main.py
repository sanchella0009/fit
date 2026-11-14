from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.endpoints import canteen, products, food_logs, health, auth, workouts, sleep

app = FastAPI(
    title="PWA Recomp & Nutrition API",
    description="Backend API для PWA-приложения рекомпозиции тела, циклического меню общежития, тренировок и свободного учета питания",
    version="1.1.0"
)

# Настройка CORS для PWA и мобильных браузеров
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение API эндпоинтов
app.include_router(auth.router, prefix="/api/v1")
app.include_router(canteen.router, prefix="/api/v1")
app.include_router(products.router, prefix="/api/v1")
app.include_router(food_logs.router, prefix="/api/v1")
app.include_router(health.router, prefix="/api/v1")
app.include_router(workouts.router, prefix="/api/v1")
app.include_router(sleep.router, prefix="/api/v1")

@app.get("/")
def root():
    return {
        "app": "PWA Recomp & Nutrition Tracker",
        "version": "1.1.0",
        "status": "online",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
