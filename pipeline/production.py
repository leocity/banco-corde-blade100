"""Corde fuori produzione: rimosse dal banco, tranne le corde di riferimento dell'utente (spec v2 §9)."""
from pipeline.estimate import base_model
from pipeline.scope import normalize_brand


def _key(brand, model):
    return normalize_brand(brand), base_model(model)


def filter_discontinued(records, status_rows, keep_ids):
    status = {(normalize_brand(s["brand"]), s["model_key"]): s for s in status_rows}
    kept, removed = [], []
    for r in records:
        s = status.get(_key(r["brand"], r["model"]))
        if s:
            r["production"] = {"status": s["status"], "successor": s.get("successor"), "urls": s.get("urls", [])[:3]}
        if s and s["status"] == "discontinued" and r["id"] not in keep_ids:
            removed.append(r)
        else:
            kept.append(r)
    return kept, removed
