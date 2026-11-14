import os
import glob
import re
from datetime import date, timedelta
from typing import Dict, Any, List, Optional
import docx

MEAL_MAP = {
    "завтрак": "BREAKFAST",
    "обед": "LUNCH",
    "полдник": "AFTERNOON_SNACK",
    "второй завтрак": "AFTERNOON_SNACK",
    "ужин": "DINNER",
    "перекус": "SNACK"
}

def clean_float(val: Any) -> float:
    if val is None:
        return 0.0
    s = str(val).strip().replace(',', '.').replace('\xa0', ' ')
    m = re.search(r'[-+]?\d*\.?\d+', s)
    return float(m.group(0)) if m else 0.0

def parse_weight_raw(weight_str: str) -> float:
    """
    Разбирает дробный или сложный вес, например:
    '200/10' -> 210.0
    '150/20/5' -> 175.0
    '100' -> 100.0
    """
    s = str(weight_str).strip().replace(' ', '')
    parts = s.split('/')
    total = 0.0
    found = False
    for p in parts:
        val = clean_float(p)
        if val > 0:
            total += val
            found = True
    return total if found else clean_float(weight_str)

def extract_day_number(file_name: str) -> Optional[int]:
    """Извлекает номер дня из имени файла (1..14)"""
    m = re.search(r'(\d+)\s*(?:день|day)?', file_name, re.IGNORECASE)
    if m:
        num = int(m.group(1))
        if 1 <= num <= 14:
            return num
    return None

def parse_menu_day_docx(file_path: str, day_number: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Парсит файл меню на 1 день из циклического меню общежития/техникума.
    Возвращает список блюд с привязкой к дню и приему пищи.
    """
    filename = os.path.basename(file_path)
    if day_number is None:
        day_number = extract_day_number(filename) or 1

    try:
        doc = docx.Document(file_path)
    except Exception as e:
        print(f"Ошибка открытия меню {file_path}: {e}")
        return []

    if not doc.tables:
        return []

    table = doc.tables[0]
    items = []
    current_meal = "BREAKFAST"

    for row_idx, row in enumerate(table.rows):
        cells = [c.text.strip().replace('\xa0', ' ') for c in row.cells]
        if not cells or not any(cells):
            continue

        first_cell = cells[0].strip()
        first_cell_lower = first_cell.lower()

        # 1. Проверяем, не строка ли это с заголовком приема пищи
        matched_meal = None
        for meal_key, meal_enum in MEAL_MAP.items():
            if meal_key in first_cell_lower and len(first_cell) < 30:
                matched_meal = meal_enum
                break

        if matched_meal:
            current_meal = matched_meal
            continue

        # 2. Проверяем на заголовок таблицы
        if "наименование" in first_cell_lower or "выход" in first_cell_lower:
            continue

        # 3. Проверяем на строку итогов (обычно пустая первая ячейка или слово "итого")
        if not first_cell or "итого" in first_cell_lower or "всего" in first_cell_lower:
            continue

        # 4. Извлекаем номер техкарты из скобок, например "(3а)", "( 35)", "(102)"
        card_number_raw = None
        card_match = re.search(r'\(\s*(?:№\s*)?([0-9]+[а-яА-Яa-zA-Z]?)\s*\)', first_cell)
        if card_match:
            card_number_raw = card_match.group(1).lower().strip()

        # Очищенное название блюда
        dish_name = re.sub(r'\s*\(\s*(?:№\s*)?[0-9]+[а-яА-Яa-zA-Z]?\s*\)\s*', '', first_cell).strip(' ,')

        # Извлечение веса (колонка 1)
        weight_raw = cells[1].strip() if len(cells) > 1 else "100"
        weight_g = parse_weight_raw(weight_raw)

        # КБЖУ (колонки 2, 3, 4, 5)
        protein = clean_float(cells[2]) if len(cells) > 2 else 0.0
        fat = clean_float(cells[3]) if len(cells) > 3 else 0.0
        carbs = clean_float(cells[4]) if len(cells) > 4 else 0.0
        calories = clean_float(cells[5]) if len(cells) > 5 else 0.0

        if calories == 0.0 and (protein > 0 or fat > 0 or carbs > 0):
            calories = round(protein * 4.0 + fat * 9.0 + carbs * 4.0, 1)

        items.append({
            "day_number": day_number,
            "meal_type": current_meal,
            "dish_name": dish_name,
            "card_number_raw": card_number_raw,
            "weight_raw": weight_raw,
            "weight_g": weight_g,
            "protein": protein,
            "fat": fat,
            "carbs": carbs,
            "calories": calories
        })

    return items

def parse_full_cycle_menu(dir_path: str) -> Dict[int, List[Dict[str, Any]]]:
    """Сканирует все дни 14-дневного цикла меню"""
    files = glob.glob(os.path.join(dir_path, "*.docx"))
    cycle_menu: Dict[int, List[Dict[str, Any]]] = {}

    for f in sorted(files):
        fname = os.path.basename(f)
        if fname.startswith("~$"):
            continue
        day_num = extract_day_number(fname)
        if day_num:
            day_items = parse_menu_day_docx(f, day_num)
            cycle_menu[day_num] = day_items

    return cycle_menu

def get_current_cycle_day(target_date: date, cycle_start_date: date = date(2026, 8, 31)) -> int:
    """
    Рассчитывает текущий день 14-дневного цикла столовой по формуле:
    ((target_date - cycle_start_date).days % 14) + 1
    31 августа 2026 — Понедельник (День 1 цикла).
    14 ноября 2026 — Суббота (День 6 цикла).
    """
    delta_days = (target_date - cycle_start_date).days
    return (delta_days % 14) + 1

if __name__ == "__main__":
    test_dir = r"F:\техникум\меню"
    print(f"Парсинг 14-дневного меню из {test_dir}...")
    cycle = parse_full_cycle_menu(test_dir)
    print(f"Загружено дней меню: {len(cycle)} из 14")
    
    today = date(2026, 11, 14)
    start = date(2026, 9, 1)
    current_day = get_current_cycle_day(today, start)
    print(f"Для даты {today} (старт цикла {start}) текущий день столовой: День №{current_day}")

    if current_day in cycle:
        print(f"\nБлюда на сегодня (День №{current_day}):")
        for it in cycle[current_day][:8]:
            print(f"[{it['meal_type']:15s}] {it['dish_name']} (выход {it['weight_raw']}) | №карты: {it['card_number_raw']} | {it['calories']} ккал")
