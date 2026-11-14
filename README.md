# Recomp PWA (Fit) • Питание, Меню Столовой и Рекомпозиция

Многопользовательское Progressive Web App (PWA) для контроля питания, тренировок и рекомпозиции тела с дизайном и физикой в стиле **Apple iOS (HIG & WWDC Fluid Interfaces)**.

Поддерживает как автоматический учет по **14-дневному циклическому меню столовой техникума** с линковкой на технологические карты (`.docx`), так и **свободный учет питания** для тех, кто готовит дома (база 150+ базовых продуктов, поиск по штрихкоду через Open Food Facts, составные рецепты).

---

## 🍏 Особенности интерфейса в стиле Apple (iOS 18+)

- **Кольца активности Apple Fitness / Health:** Концентрические SVG-кольца суточного прогресса (Ккал, Белки, Жиры, Углеводы) с градиентами, скругленными концами и динамическим пружинным заполнением.
- **Материалы Frosted Glass & Vibrancy:** Полупрозрачные стеклянные панели навигации и нижний Tab Bar (`backdrop-filter: blur(28px) saturate(190%)`), плавная поддержка Dark/Light тем.
- **Физический Segmented Control:** Переключение между режимами «Общежитие» и «Свободный» с пружинным скользящим бегунком.
- **Интерактивные шторки (Apple Bottom Sheet):** Жестовое управление 1:1, расчет скорости и проекции импульса (WWDC Momentum Projection), резиновые границы (Rubber-Banding).
- **Тактильный виброотклик (Taptic Engine):** Микро-вибрация при переключении сегментов, отметке блюд и синхронизации (Web Vibration API).
- **Синхронизация с Apple Shortcuts:** Автоматический вебхук (`POST /api/v1/health/sync`) для выгрузки шагов, активных калорий с Apple Watch и веса со смарт-весов.

---

## 🛠 Стек технологий

- **Frontend:** React 18, TypeScript, Vite (`vite-plugin-pwa`, Workbox, Service Workers, офлайн-доступ), Tailwind CSS (Mobile-First, SF Pro Typography).
- **Backend:** Python, FastAPI, SQLAlchemy 2.0 ORM, `python-docx` (парсинг техкарт и циклического меню), `httpx` (Open Food Facts API).
- **База данных:** PostgreSQL / SQLite с единым журналом `food_logs` и снапшотами КБЖУ на момент добавления.
- **Деплой:** Docker & Docker Compose (Multi-stage сборка Vite -> Nginx + Uvicorn FastAPI).

---

## 🚀 Быстрый старт

### Вариант 1: Запуск через Docker Compose (Рекомендуемый для продакшена)
```bash
docker-compose up --build -d
```
- Frontend PWA: `http://localhost:3000`
- Backend API Docs (Swagger): `http://localhost:8000/docs`

### Вариант 2: Локальная разработка

#### 1. Бэкенд
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt

# Первичный запуск и сидирование базы данных (продукты, 14-дневное меню, техкарты):
python -m app.seeds.seed_runner

# Запуск сервера
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Фронтенд (PWA)
```bash
cd frontend
npm install
npm run dev -- --host
```

---

## 📱 Установка на iPhone (PWA Standalone)

1. Откройте приложение в **Safari** на iPhone (например, `http://<IP_СЕРВЕРА>:3000`).
2. Нажмите кнопку **«Поделиться»** (иконка квадрата со стрелкой вверх).
3. Выберите пункт **«На экран "Домой"»**.
4. Приложение развернется в полноэкранном нативном режиме без полос браузера с поддержкой выреза под Dynamic Island.
