-- ====================================================================
-- СХЕМА РЕЛЯЦИОННОЙ БАЗЫ ДАННЫХ ДЛЯ PWA-ПРИЛОЖЕНИЯ РЕКОМПОЗИЦИИ ТЕЛА
-- И ЦИКЛИЧЕСКОГО УЧЕТА ПИТАНИЯ (PostgreSQL / SQLite совместимая)
-- ====================================================================

-- 1. ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER')),
    dietary_mode VARCHAR(20) NOT NULL DEFAULT 'DORMITORY' CHECK (dietary_mode IN ('DORMITORY', 'FREE')),
    webhook_token VARCHAR(64) UNIQUE NOT NULL,
    cycle_start_date DATE NOT NULL DEFAULT '2026-09-01',
    gender VARCHAR(10) DEFAULT 'MALE',
    birth_date DATE,
    height_cm REAL,
    current_weight_kg REAL,
    target_calories REAL NOT NULL DEFAULT 2200.0,
    target_protein_g REAL NOT NULL DEFAULT 150.0,
    target_fat_g REAL NOT NULL DEFAULT 70.0,
    target_carbs_g REAL NOT NULL DEFAULT 240.0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_webhook ON users(webhook_token);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 2. КАТАЛОГ ПРОДУКТОВ (Базовые + Open Food Facts + Пользовательские)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    barcode VARCHAR(32) UNIQUE,
    brand VARCHAR(100),
    category VARCHAR(100),
    calories_100g REAL NOT NULL,
    protein_100g REAL NOT NULL DEFAULT 0.0,
    fat_100g REAL NOT NULL DEFAULT 0.0,
    carbs_100g REAL NOT NULL DEFAULT 0.0,
    fiber_100g REAL DEFAULT 0.0,
    piece_weight_g REAL,
    piece_name VARCHAR(50),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_custom BOOLEAN NOT NULL DEFAULT FALSE,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    source VARCHAR(50) NOT NULL DEFAULT 'SEED',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- 3. ТЕХНОЛОГИЧЕСКИЕ КАРТЫ СТОЛОВОЙ
CREATE TABLE IF NOT EXISTS tech_cards (
    id SERIAL PRIMARY KEY,
    card_number VARCHAR(30) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    recipe_source VARCHAR(255),
    yield_g REAL NOT NULL,
    calories_portion REAL NOT NULL,
    protein_portion REAL NOT NULL,
    fat_portion REAL NOT NULL,
    carbs_portion REAL NOT NULL,
    calories_100g REAL NOT NULL,
    protein_100g REAL NOT NULL,
    fat_100g REAL NOT NULL,
    carbs_100g REAL NOT NULL,
    cooking_technology TEXT,
    quality_requirements TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tech_cards_num ON tech_cards(card_number);
CREATE INDEX IF NOT EXISTS idx_tech_cards_title ON tech_cards(title);

-- Ингредиенты техкарт (Брутто/Нетто/Отход)
CREATE TABLE IF NOT EXISTS tech_card_ingredients (
    id SERIAL PRIMARY KEY,
    tech_card_id INTEGER NOT NULL REFERENCES tech_cards(id) ON DELETE CASCADE,
    ingredient_name VARCHAR(150) NOT NULL,
    brutto_g REAL,
    netto_g REAL,
    waste_percent REAL
);

CREATE INDEX IF NOT EXISTS idx_tci_card_id ON tech_card_ingredients(tech_card_id);

-- 4. 14-ДНЕВНОЕ ЦИКЛИЧЕСКОЕ РАСПИСАНИЕ СТОЛОВОЙ
CREATE TABLE IF NOT EXISTS canteen_menu_items (
    id SERIAL PRIMARY KEY,
    day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 14),
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('BREAKFAST', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER', 'LATE_DINNER', 'SNACK')),
    dish_name VARCHAR(255) NOT NULL,
    card_number_raw VARCHAR(50),
    weight_raw VARCHAR(50) NOT NULL,
    weight_g REAL NOT NULL,
    tech_card_id INTEGER REFERENCES tech_cards(id) ON DELETE SET NULL,
    protein REAL DEFAULT 0.0,
    fat REAL DEFAULT 0.0,
    carbs REAL DEFAULT 0.0,
    calories REAL DEFAULT 0.0
);

CREATE INDEX IF NOT EXISTS idx_canteen_day_meal ON canteen_menu_items(day_number, meal_type);

-- 5. РЕЦЕПТЫ ПОЛЬЗОВАТЕЛЕЙ (СОСТАВНЫЕ БЛЮДА)
CREATE TABLE IF NOT EXISTS user_recipes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    total_raw_weight_g REAL DEFAULT 0.0,
    cooked_weight_g REAL NOT NULL,
    calories_100g REAL NOT NULL,
    protein_100g REAL NOT NULL,
    fat_100g REAL NOT NULL,
    carbs_100g REAL NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES user_recipes(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    custom_name VARCHAR(150),
    weight_g REAL NOT NULL,
    calories REAL NOT NULL,
    protein REAL NOT NULL,
    fat REAL NOT NULL,
    carbs REAL NOT NULL
);

-- 6. ЕДИНЫЙ ЖУРНАЛ ЛОГИРОВАНИЯ ПИТАНИЯ (FOOD LOGS)
CREATE TABLE IF NOT EXISTS food_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('BREAKFAST', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER', 'LATE_DINNER', 'SNACK')),
    entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('PRODUCT', 'TECH_CARD', 'RECIPE', 'CANTEEN_DISH', 'CUSTOM')),
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    tech_card_id INTEGER REFERENCES tech_cards(id) ON DELETE SET NULL,
    recipe_id INTEGER REFERENCES user_recipes(id) ON DELETE SET NULL,
    canteen_menu_item_id INTEGER REFERENCES canteen_menu_items(id) ON DELETE SET NULL,
    title_snapshot VARCHAR(255) NOT NULL,
    portion_multiplier REAL NOT NULL DEFAULT 1.0,
    amount_g REAL NOT NULL,
    meal_time VARCHAR(10),
    calories REAL NOT NULL,
    protein REAL NOT NULL,
    fat REAL NOT NULL,
    carbs REAL NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON food_logs(user_id, log_date);

-- 7. ТРЕНИРОВКИ, ШАБЛОНЫ И ПОДХОДЫ
CREATE TABLE IF NOT EXISTS workout_templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    workout_type VARCHAR(30) NOT NULL DEFAULT 'STRENGTH',
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workout_template_exercises (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
    exercise_name VARCHAR(100) NOT NULL,
    order_index INTEGER DEFAULT 0,
    target_sets INTEGER DEFAULT 3,
    target_reps INTEGER DEFAULT 10,
    default_weight_kg REAL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS workout_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    template_id INTEGER REFERENCES workout_templates(id) ON DELETE SET NULL,
    title VARCHAR(100) NOT NULL,
    workout_type VARCHAR(30) NOT NULL DEFAULT 'STRENGTH',
    duration_minutes INTEGER DEFAULT 45,
    active_calories_burned REAL DEFAULT 0.0,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON workout_logs(user_id, date);

CREATE TABLE IF NOT EXISTS workout_set_logs (
    id SERIAL PRIMARY KEY,
    workout_log_id INTEGER NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
    exercise_name VARCHAR(100) NOT NULL,
    set_number INTEGER NOT NULL,
    weight_kg REAL NOT NULL,
    reps INTEGER NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT TRUE
);

-- 8. СИНХРОНИЗАЦИЯ МЕТРИК ЗДОРОВЬЯ (ВЕБХУКИ)
CREATE TABLE IF NOT EXISTS health_sync_metrics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    steps INTEGER DEFAULT 0,
    active_calories REAL DEFAULT 0.0,
    weight_kg REAL,
    source VARCHAR(50) DEFAULT 'APPLE_SHORTCUT',
    synced_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_health_date UNIQUE(user_id, date)
);

-- 9. ЗАМЕРЫ И ФОТО ПРОГРЕССА
CREATE TABLE IF NOT EXISTS body_measurements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weight_kg REAL NOT NULL,
    waist_cm REAL,
    chest_cm REAL,
    hips_cm REAL,
    bicep_cm REAL,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_measurements_user_date ON body_measurements(user_id, date);

CREATE TABLE IF NOT EXISTS body_progress_photos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    photo_path VARCHAR(255) NOT NULL,
    pose_type VARCHAR(20) DEFAULT 'FRONT',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. СОН И ИИ-АНАЛИЗ ВОССТАНОВЛЕНИЯ (GEMINI AI)
CREATE TABLE IF NOT EXISTS sleep_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sleep_date DATE NOT NULL,
    bed_time VARCHAR(10),
    wake_time VARCHAR(10),
    duration_hours REAL NOT NULL,
    deep_sleep_hours REAL,
    rem_sleep_hours REAL,
    quality_rating INTEGER DEFAULT 4,
    notes TEXT,
    ai_recovery_score INTEGER,
    ai_verdict VARCHAR(255),
    ai_analysis_json TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_sleep_date UNIQUE (user_id, sleep_date)
);

CREATE INDEX IF NOT EXISTS idx_sleep_user_date ON sleep_logs(user_id, sleep_date);
