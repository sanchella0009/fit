import os
import glob
import re
from typing import Dict, Any, List, Optional
import docx

def clean_float(val: Any) -> Optional[float]:
    if val is None:
        return None
    s = str(val).strip().replace(',', '.').replace('\xa0', ' ')
    m = re.search(r'[-+]?\d*\.?\d+', s)
    return float(m.group(0)) if m else None

def parse_tech_card_docx(file_path: str) -> Optional[Dict[str, Any]]:
    """
    Парсит отдельный файл технологической карты (.docx).
    Извлекает:
    - Номер техкарты (e.g. "4", "35", "100")
    - Название блюда
    - Источник рецептуры
    - Выход (в граммах на 1 порцию)
    - КБЖУ на 1 порцию
    - КБЖУ пересчитанное на 100 г
    - Список сырья (Брутто/Нетто/Отход)
    - Технологию приготовления и требования к качеству
    """
    try:
        doc = docx.Document(file_path)
    except Exception as e:
        print(f"Ошибка открытия файла {file_path}: {e}")
        return None

    filename = os.path.basename(file_path)
    
    # 1. Поиск номера техкарты
    card_number = None
    fn_match = re.search(r'(?:№\s*|тех\.?\s*карта\s*№?\s*)(\d+[а-яА-Яa-zA-Z]?)', filename, re.IGNORECASE)
    if fn_match:
        card_number = fn_match.group(1).lower().strip()

    title = None
    recipe_source = None
    tech_text = []
    quality_text = []
    mode = "GENERAL"

    for p in doc.paragraphs:
        txt = p.text.strip()
        if not txt:
            continue

        # Поиск номера в тексте, если в названии файла не найден
        if not card_number:
            card_p_match = re.search(r'(?:карты|изделия|блюда)\s*№?\s*[:;]?\s*(\d+[а-яА-Яa-zA-Z]?)', txt, re.IGNORECASE)
            if card_p_match:
                card_number = card_p_match.group(1).lower().strip()

        # Поиск наименования
        title_match = re.search(r'Наименование\s+.*?(?:изделия|блюда).*?[:;]\s*(.+)', txt, re.IGNORECASE)
        if title_match:
            title = title_match.group(1).strip()
            continue

        # Источник рецептуры
        if "сборник" in txt.lower() or "рецептур" in txt.lower():
            recipe_source = txt

        # Технология приготовления
        if "технология приготовления" in txt.lower():
            mode = "TECH"
            tech_text.append(txt)
            continue
        elif "требование к качеству" in txt.lower() or "требования к качеству" in txt.lower():
            mode = "QUALITY"
            quality_text.append(txt)
            continue

        if mode == "TECH":
            tech_text.append(txt)
        elif mode == "QUALITY":
            quality_text.append(txt)

    if not title:
        # Fallback на имя файла
        clean_name = re.sub(r'^(?:№\s*\d+|тех\.?\s*карта\s*№?\s*\d+)\s*', '', filename, flags=re.IGNORECASE)
        clean_name = os.path.splitext(clean_name)[0].strip()
        title = clean_name or filename

    # 2. Парсинг таблиц
    ingredients: List[Dict[str, Any]] = []
    yield_g = None
    kbzu_portion = {"calories": 0.0, "protein": 0.0, "fat": 0.0, "carbs": 0.0}

    tables = doc.tables
    if len(tables) > 0:
        raw_table = tables[0]
        # Определяем столбцы брутто и нетто
        brutto_col = None
        netto_col = None

        for row_idx, row in enumerate(raw_table.rows[:4]):
            cells_text = [c.text.strip().lower() for c in row.cells]
            for c_idx, cell in enumerate(cells_text):
                if "брутто" in cell and brutto_col is None:
                    brutto_col = c_idx
                if "нетто" in cell and netto_col is None:
                    netto_col = c_idx
            if brutto_col is not None and netto_col is not None:
                break

        # Читаем ингредиенты
        for row in raw_table.rows[1:]:
            cells = [c.text.strip() for c in row.cells]
            if not cells or not cells[0]:
                continue
            name = cells[0].strip()

            # Проверка на строку "Выход"
            if "выход" in name.lower():
                # Ищем число выхода в ячейках
                for val_str in cells[1:]:
                    num = clean_float(val_str)
                    if num and num > 0:
                        yield_g = num
                        break
                continue

            # Игнорируем заголовки и служебные строки
            if any(term in name.lower() for term in ["наименование", "сырья", "расход", "1 порция", "100порц", "брутто"]):
                continue

            b_val = clean_float(cells[brutto_col]) if brutto_col is not None and brutto_col < len(cells) else None
            n_val = clean_float(cells[netto_col]) if netto_col is not None and netto_col < len(cells) else None
            waste = None
            if b_val and n_val and b_val > 0:
                waste = round(((b_val - n_val) / b_val) * 100, 1)

            ingredients.append({
                "name": name,
                "brutto_g": b_val,
                "netto_g": n_val,
                "waste_percent": waste
            })

    # 3. Парсинг КБЖУ из второй таблицы
    if len(tables) > 1:
        kbzu_table = tables[1]
        for row in kbzu_table.rows:
            row_txt = " ".join([c.text.strip().lower() for c in row.cells])
            cells = [c.text.strip() for c in row.cells]
            val = None
            for c in cells[1:]:
                f = clean_float(c)
                if f is not None:
                    val = f
                    break
            if val is not None:
                if "белк" in row_txt:
                    kbzu_portion["protein"] = val
                elif "жир" in row_txt:
                    kbzu_portion["fat"] = val
                elif "углевод" in row_txt:
                    kbzu_portion["carbs"] = val
                elif "ккал" in row_txt or "эн" in row_txt or "ценност" in row_txt:
                    kbzu_portion["calories"] = val

    # Если выход не найден в первой таблице, рассчитываем по сумме нетто или дефолту
    if not yield_g or yield_g <= 0:
        netto_sum = sum([i["netto_g"] for i in ingredients if i.get("netto_g")])
        yield_g = netto_sum if netto_sum > 0 else 100.0

    # Пересчет КБЖУ на 100 г
    ratio = 100.0 / yield_g if yield_g > 0 else 1.0
    kbzu_100g = {
        "calories": round(kbzu_portion["calories"] * ratio, 2),
        "protein": round(kbzu_portion["protein"] * ratio, 2),
        "fat": round(kbzu_portion["fat"] * ratio, 2),
        "carbs": round(kbzu_portion["carbs"] * ratio, 2)
    }

    return {
        "card_number": card_number or os.path.splitext(filename)[0],
        "title": title,
        "recipe_source": recipe_source,
        "yield_g": float(yield_g),
        "kbzu_portion": kbzu_portion,
        "kbzu_100g": kbzu_100g,
        "ingredients": ingredients,
        "cooking_technology": "\n".join(tech_text),
        "quality_requirements": "\n".join(quality_text),
        "file_source": filename
    }

def parse_tech_cards_directory(dir_path: str) -> List[Dict[str, Any]]:
    """Сканирует папку и парсит все технологические карты"""
    files = glob.glob(os.path.join(dir_path, "**", "*.docx"), recursive=True)
    results = []
    for f in files:
        fname = os.path.basename(f)
        if fname.startswith("~$") or "ведомость" in fname.lower():
            continue
        parsed = parse_tech_card_docx(f)
        if parsed and parsed.get("title"):
            results.append(parsed)
    return results

if __name__ == "__main__":
    import sys
    test_dir = r"F:\техникум\тех.каты для горохова\тех.карты"
    if len(sys.argv) > 1:
        test_dir = sys.argv[1]
    print(f"Парсинг техкарт из: {test_dir}...")
    cards = parse_tech_cards_directory(test_dir)
    print(f"Успешно распарсено техкарт: {len(cards)}")
    for c in cards[:5]:
        print(f"№{c['card_number']}: {c['title']} | Выход: {c['yield_g']}г | Порция КБЖУ: {c['kbzu_portion']['calories']} ккал (Б:{c['kbzu_portion']['protein']} Ж:{c['kbzu_portion']['fat']} У:{c['kbzu_portion']['carbs']})")
