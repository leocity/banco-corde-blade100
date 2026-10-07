"""Corde vecchie (uscite prima del cutoff) o fuori produzione: rimosse dal banco, tranne le corde di riferimento
dell'utente (spec v2 §9, decisione utente 2026-10-07: conta solo l'anno di uscita, soglia 2020)."""
from pipeline.estimate import base_model
from pipeline.scope import normalize_brand


def _key(brand, model):
    return normalize_brand(brand), base_model(model)


def filter_discontinued(records, status_rows, keep_ids, years=None, cutoff=2020):
    status = {(normalize_brand(s["brand"]), s["model_key"]): s for s in status_rows}
    yrs = {(normalize_brand(y["brand"]), y["model_key"]): y for y in (years or [])}
    kept, removed = [], []
    for r in records:
        k = _key(r["brand"], r["model"])
        s, y = status.get(k), yrs.get(k)
        year = (y or {}).get("year")
        reason = None
        if s and s["status"] == "discontinued":
            reason = "fuori produzione"
        elif year is not None and year < cutoff:
            # anche un limite superiore ("già recensita nel 2016") basta: è uscita al più tardi quell'anno
            reason = f"uscita nel {year}" if (y or {}).get("confidence") == "exact" else f"già in vendita nel {year}"
        r["production"] = {"status": (s or {}).get("status"), "successor": (s or {}).get("successor"),
                           "year": year, "year_confidence": (y or {}).get("confidence"), "reason": reason,
                           "urls": ((s or {}).get("urls", []) + (y or {}).get("urls", []))[:4]}
        if reason and r["id"] not in keep_ids:
            removed.append(r)
        else:
            kept.append(r)
    return kept, removed
