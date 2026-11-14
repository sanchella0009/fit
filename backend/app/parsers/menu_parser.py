import os
import glob
import re
from datetime import date, timedelta
from typing import Dict, Any, List, Optional
import docx

MEAL_MAP_ORDERED = [
    ("2-й ужин", "LATE_DINNER"),
    ("второй ужин", "LATE_DINNER"),
    ("2-ой ужин", "LATE_DINNER"),
    ("вечерний ужин", "LATE_DINNER"),
    ("поздний ужин", "LATE_DINNER"),
    ("завтрак", "BREAKFAST"),
    ("обед", "LUNCH"),
    ("полдник", "AFTERNOON_SNACK"),
    ("второй завтрак", "AFTERNOON_SNACK"),
    ("ужин", "DINNER"),
    ("перекус", "SNACK"),
]

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
    s = str(weight_str).strip().replace(' ', '').replace('г', '')
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

def split_slash_pair(val_str: Any) -> (float, float):
    if not val_str:
        return 0.0, 0.0
    parts = str(val_str).replace('г', '').replace('\xa0', '').split('/')
    if len(parts) >= 2:
        return clean_float(parts[0]), clean_float(parts[1])
    return clean_float(val_str), 0.0

def parse_menu_day_docx(file_path: str, day_number: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Парсит файл меню на 1 день из циклического меню общежития/техникума.
    Возвращает список блюд с привязкой к дню и приему пищи.
    Автоматически разделяет совмещенные позиции хлеба/батона и кефира/батона.
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

    # Динамическое определение колонок из заголовка таблицы (защита от дублированных колонок, как в День 13)
    col_map = {"weight": 1, "prot": 2, "fat": 3, "carbs": 4, "cal": 5}
    if len(table.rows) > 0:
        first_row_texts = [c.text.strip().lower() for c in table.rows[0].cells]
        fat_set = False
        for idx, h in enumerate(first_row_texts):
            if "выход" in h:
                col_map["weight"] = idx
            elif h == "б" or "бел" in h:
                col_map["prot"] = idx
            elif (h == "ж" or "жир" in h) and not fat_set:
                col_map["fat"] = idx
                fat_set = True
            elif h == "у" or "угл" in h:
                col_map["carbs"] = idx
            elif "ккал" in h or "калор" in h or "эн" in h:
                col_map["cal"] = idx

    for row_idx, row in enumerate(table.rows):
        cells = [c.text.strip().replace('\xa0', ' ') for c in row.cells]
        if not cells or not any(cells):
            continue

        first_cell = cells[0].strip()
        first_cell_lower = first_cell.lower()

        # 1. Проверяем строку заголовка приема пищи (сначала 2-й ужин, затем ужин и т.д.)
        matched_meal = None
        for meal_key, meal_enum in MEAL_MAP_ORDERED:
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

        def get_cell_val(key: str, default: str = "") -> str:
            idx = col_map.get(key)
            return cells[idx].strip() if idx is not None and idx < len(cells) else default

        weight_cell = get_cell_val("weight", "100")
        prot_cell = get_cell_val("prot", "")
        fat_cell = get_cell_val("fat", "")
        carbs_cell = get_cell_val("carbs", "")
        cal_cell = get_cell_val("cal", "")

        # 4. Проверяем, нужно ли РАЗДЕЛИТЬ составную позицию (хлеб + батон, кефир/йогурт + батон)
        # Признаки: слэш в калориях/весе И запятая или слово "батон" / "хлеб" / "кефир"
        is_split_candidate = ('/' in cal_cell or '/' in weight_cell) and (
            ',' in first_cell or 'батон' in first_cell_lower or 'хлеб' in first_cell_lower
        )

        if is_split_candidate and ('/' in cal_cell or '/' in prot_cell):
            # Извлекаем все номера техкарт из скобок: (101, 102) -> ['101', '102']
            cards_matches = re.findall(r'[0-9]+[а-яА-Яa-zA-Z]?', first_cell)
            raw_title_no_cards = re.sub(r'\(.*?\)', '', first_cell).strip(' ,')
            names_parts = [n.strip() for n in raw_title_no_cards.split(',') if n.strip()]

            w1, w2 = split_slash_pair(weight_cell)
            p1, p2 = split_slash_pair(prot_cell)
            f1, f2 = split_slash_pair(fat_cell)
            c1, c2 = split_slash_pair(carbs_cell)
            cal1, cal2 = split_slash_pair(cal_cell)

            name1 = names_parts[0] if len(names_parts) > 0 else "Хлеб ржаной"
            name2 = names_parts[1] if len(names_parts) > 1 else "Батон «Столовый»"

            # Убираем кавычки или артефакты
            name1 = name1.replace('«', '').replace('»', '').strip()
            name2 = name2.replace('«', '').replace('»', '').strip()
            if 'батон' in name2.lower() and '«столовый»' not in name2.lower():
                name2 = "Батон «Столовый»"
            if 'хлеб' in name1.lower() and 'ржаной' not in name1.lower():
                name1 = "Хлеб ржаной"
            if 'кефир' in name1.lower():
                name1 = "Кефир"
            elif 'йогурт' in name1.lower():
                name1 = "Йогурт"
            elif 'ряженка' in name1.lower():
                name1 = "Ряженка"
            elif 'снежок' in name1.lower():
                name1 = "«Снежок»"

            card1 = cards_matches[0] if len(cards_matches) > 0 else None
            card2 = cards_matches[1] if len(cards_matches) > 1 else ("102" if 'батон' in name2.lower() else None)

            # Элемент 1
            items.append({
                "day_number": day_number,
                "meal_type": current_meal,
                "dish_name": name1,
                "card_number_raw": card1,
                "weight_raw": str(int(w1) if w1.is_integer() else w1),
                "weight_g": w1,
                "protein": p1,
                "fat": f1,
                "carbs": c1,
                "calories": cal1 if cal1 > 0 else round(p1*4 + f1*9 + c1*4, 1)
            })

            # Элемент 2
            items.append({
                "day_number": day_number,
                "meal_type": current_meal,
                "dish_name": name2,
                "card_number_raw": card2,
                "weight_raw": str(int(w2) if w2.is_integer() else w2),
                "weight_g": w2,
                "protein": p2,
                "fat": f2,
                "carbs": c2,
                "calories": cal2 if cal2 > 0 else round(p2*4 + f2*9 + c2*4, 1)
            })
            continue

        # Обычная одиночная позиция
        card_number_raw = None
        card_match = re.search(r'\(\s*(?:№\s*)?([0-9]+[а-яА-Яa-zA-Z]?)\s*\)', first_cell)
        if card_match:
            card_number_raw = card_match.group(1).lower().strip()

        dish_name = re.sub(r'\s*\(\s*(?:№\s*)?[0-9]+[а-яА-Яa-zA-Z]?\s*\)\s*', '', first_cell).strip(' ,')
        weight_raw = weight_cell
        weight_g = parse_weight_raw(weight_raw)

        protein = clean_float(prot_cell)
        fat = clean_float(fat_cell)
        carbs = clean_float(carbs_cell)
        calories = clean_float(cal_cell)

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

def parse_full_cycle_menu(menu_dir: str) -> Dict[int, List[Dict[str, Any]]]:
    """Парсит все 14 дней циклического меню общежития техникума"""
    files = glob.glob(os.path.join(menu_dir, "*.docx"))
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
