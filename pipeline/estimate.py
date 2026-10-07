"""Spin e rigidità di riferimento con stima dichiarata (spec v2 §5.1–5.2).

Priorità spin: misurato > parente (±0,5) > tester calibrato (solo se batte la media) > qualitativo > None.
"""
import math
import re

COLOURS = ("black", "blue", "pink", "orange", "ornage", "green", "yellow", "white", "neon", "matcha", "pom",
           "gry", "grey", "blk", "bk", "ble", "desert", "yl", "pk", "red", "silver", "gold", "bronze")
MEASURED = ("exact", "probable")
RELATIVE_MARGIN = 0.5


def fit_linear(xs, ys):
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs)
    a = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx if sxx else 0.0
    return a, my - a * mx


def loo_mae(xs, ys):
    errs = []
    for i in range(len(xs)):
        a, b = fit_linear(xs[:i] + xs[i + 1:], ys[:i] + ys[i + 1:])
        errs.append(abs(a * xs[i] + b - ys[i]))
    return sum(errs) / len(errs)


def _loo_mean_mae(ys):
    n = len(ys)
    return sum(abs((sum(ys) - y) / (n - 1) - y) for y in ys) / n


def calibrate_tester_spin(pairs):
    if len(pairs) < 5:
        return {"a": None, "b": None, "mae": None, "baseline_mae": None, "usable": False, "n": len(pairs)}
    xs, ys = [float(p[0]) for p in pairs], [float(p[1]) for p in pairs]
    a, b = fit_linear(xs, ys)
    mae, base = loo_mae(xs, ys), _loo_mean_mae(ys)
    # utile solo se la relazione è nel verso giusto e batte la media di almeno il 5%
    usable = a > 0 and mae < 0.95 * base
    return {"a": a, "b": b, "mae": round(mae, 2), "baseline_mae": round(base, 2), "usable": usable, "n": len(pairs)}


def base_model(model):
    words = [w for w in re.split(r"[\s\-]+", model.lower()) if w and w not in COLOURS]
    return " ".join(words)


def relatives_of(rec, records):
    key = (rec["brand"], base_model(rec["model"]))
    rel = [r for r in records if r["id"] != rec["id"] and (r["brand"], base_model(r["model"])) == key
           and r.get("twu") and r["twu"].get("match") in MEASURED]
    return sorted(rel, key=lambda r: abs((r.get("gauge_mm") or 0) - (rec.get("gauge_mm") or 0)))


def _band(level, pop):
    """Livello 1–5 -> valore al percentile 10/30/50/70/90 della popolazione misurata, margine = sd della fascia."""
    s = sorted(pop)
    p = 10 + (max(1.0, min(5.0, level)) - 1) * 20
    q = lambda pct: s[min(len(s) - 1, max(0, round(pct / 100 * (len(s) - 1))))]
    band = [v for v in s if q(p - 10) <= v <= q(p + 10)] or s
    m = sum(band) / len(band)
    sd = math.sqrt(sum((v - m) ** 2 for v in band) / len(band)) or (max(s) - min(s)) / 10
    v = q(p)
    return round(v, 2), round(v - sd, 2), round(v + sd, 2)


def _out(value, low, high, kind, n=1):
    return {"value": round(value, 2), "low": round(low, 2), "high": round(high, 2), "kind": kind, "basis_n": n}


def estimate_spin(rec, relatives, tester_agg, calib, twu_spin_pop):
    t = rec.get("twu") or {}
    if t.get("spin_potential") is not None:
        v = t["spin_potential"]
        if t.get("match") in MEASURED:
            return _out(v, v, v, "misurato")
        return _out(v, v - RELATIVE_MARGIN, v + RELATIVE_MARGIN, "parente")
    for r in relatives:
        v = r["twu"].get("spin_potential")
        if v is not None:
            return _out(v, v - RELATIVE_MARGIN, v + RELATIVE_MARGIN, "parente")
    score = ((tester_agg or {}).get("score") or {}).get("spin")
    if score is not None and calib and calib.get("usable"):
        v = calib["a"] * score + calib["b"]
        return _out(v, v - calib["mae"], v + calib["mae"], "tester")
    level = ((tester_agg or {}).get("level") or {}).get("spin")
    if level is None and score is not None:
        level = 1 + score / 25  # 0–100 -> 1–5
    if level is not None and twu_spin_pop:
        return _out(*_band(level, twu_spin_pop), "qualitativo")
    return None


def estimate_stiffness(rec, relatives, rp_to_twu, tester_agg, twu_stiff_pop):
    t = rec.get("twu") or {}
    if t.get("stiffness_lbin") is not None:
        v = t["stiffness_lbin"]
        kind = "misurata" if t.get("match") in MEASURED else "parente"
        return {"value_lbin": v, "low": v, "high": v, "kind": kind}
    for r in relatives:
        v = r["twu"].get("stiffness_lbin")
        if v is not None:
            return {"value_lbin": v, "low": v, "high": v, "kind": "parente"}
    rp = (rec.get("rpedia") or {}).get("static_stiffness_kgmm")
    if rp is not None and rp_to_twu:
        a, b, mae = rp_to_twu
        v = round(a * rp + b, 1)
        return {"value_lbin": v, "low": round(v - mae, 1), "high": round(v + mae, 1), "kind": "da Racketpedia"}
    level = ((tester_agg or {}).get("level") or {}).get("stiffness")
    if level is not None and twu_stiff_pop:
        v, lo, hi = _band(level, twu_stiff_pop)
        return {"value_lbin": v, "low": lo, "high": hi, "kind": "qualitativo"}
    return None
