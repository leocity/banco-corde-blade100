"""Completezza del catalogo: corde delle marche richieste che non hanno dati di laboratorio (spec v2 §3)."""
from pipeline.scope import gauge_to_mm, normalize_brand, normalize_gauge, normalize_model, string_id


def _key(brand, model):
    return normalize_brand(brand), normalize_model(model).lower().replace("-", " ")


def _norm(item):
    brand, model = normalize_brand(item["brand"]), normalize_model(item["model"])
    label = normalize_gauge(item.get("gauge_label"))
    mm = item.get("gauge_mm") or gauge_to_mm(label, brand=brand, model=model)
    return brand, model, label, mm


def _present(records, item):
    brand, model, label, mm = _norm(item)
    sid = string_id(brand, model, label) if label else None
    for r in records:
        if sid and r["id"] == sid:
            return True
        if _key(r["brand"], r["model"]) == _key(brand, model) and mm and r.get("gauge_mm") \
                and abs(r["gauge_mm"] - mm) <= 0.02:
            return True
    return False


def add_catalog_only(records, catalog):
    out = list(records)
    for item in catalog:
        if _present(out, item):
            continue
        brand, model, label, mm = _norm(item)
        out.append({
            "id": string_id(brand, model, label or f"{mm:.2f}"),
            "brand": brand, "model": model, "gauge_label": label, "gauge_mm": mm,
            "shape": item.get("shape"), "shape_source": item.get("source_url"),
            "material": item.get("material") or "copoly",
            "is_target": True, "excel": None, "twu": None, "rpedia": None,
            "catalog_only": True, "preference": None, "coverage": 0,
        })
    return out


def missing_from(records, catalog):
    return [f"{i['brand']} {i['model']} {i.get('gauge_mm')}" for i in catalog if not _present(records, i)]
