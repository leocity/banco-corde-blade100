"""Excel Ektelon -> record per corda (spec §4, §5.1)."""
import json
import sys
from collections import OrderedDict

from pipeline.scope import (gauge_to_mm, in_scope, normalize_brand, normalize_gauge,
                            normalize_model, string_id)

TENSIONS = (40, 50, 60, 65)
SHAPES = {"OCTO": "OCT"}


def _num(v):
    try:
        return None if v is None or v == "" else float(v)
    except (TypeError, ValueError):
        return None


def _pct(ratio):
    r = _num(ratio)
    return None if r is None else round((r - 1) * 100, 3)


def _warn(msg):
    print(f"warning: {msg}", file=sys.stderr)


def _first(rows, col):
    for r in rows:
        v = _num(r[col])
        if v is not None:
            return v
    return None


def _build(key, rows):
    brand, model, gauge = key
    material = next((str(r[3]).strip().lower() for r in rows if r[3]), None)
    if material is None:
        _warn(f"{brand} {model} {gauge}: tipo mancante, scartata")
        return None
    if not in_scope(brand, model, gauge, material):
        return None
    by_t = {}
    for r in rows:
        t = int(_num(r[5]) or 0)
        if t in TENSIONS and t not in by_t:
            by_t[t] = r
    missing = [t for t in TENSIONS if t not in by_t]
    if missing:
        _warn(f"{brand} {model} {gauge}: righe mancanti per {missing} lbs")
    shape_raw = next((str(r[4]).strip().upper() for r in rows if r[4]), None)
    col = lambda c, f=_num: {t: (f(by_t[t][c]) if t in by_t else None) for t in TENSIONS}
    stiff = col(11)
    stiff_vals = [v for v in stiff.values() if v is not None]
    r40, r50, r65 = by_t.get(40), by_t.get(50), by_t.get(65)
    s_init = _num(r40[16]) if r40 else None
    s_24 = _num(r40[17]) if r40 else None
    tl6_raw = _num(r50[20]) if r50 and r50[20] is not None else _first(rows, 20)
    tl12_raw = _num(r50[21]) if r50 and r50[21] is not None else _first(rows, 21)
    return {
        "id": string_id(brand, model, gauge),
        "brand": brand,
        "model": model,
        "gauge_label": gauge,
        "gauge_mm": gauge_to_mm(gauge),
        "shape": SHAPES.get(shape_raw, shape_raw),
        "material": material,
        "excel": {
            "stretch_pct": col(7, _pct),
            "recover_pct": col(9, _pct),
            "stiff_index": stiff,
            "stiff_index_avg": round(sum(stiff_vals) / len(stiff_vals), 3) if stiff_vals else None,
            "olg_16x19": col(13),
            "elong_40": _num(r40[14]) if r40 else None,
            "elong_65": _num(r65[14]) if r65 else None,
            "static_initial": s_init,
            "static_24h": s_24,
            "static_recoil": _num(r40[18]) if r40 else None,
            "static_24h_creep": round(s_24 - s_init, 3) if None not in (s_init, s_24) else None,
            "tl6_raw": tl6_raw,
            "tl12_raw": tl12_raw,
            # 0% in 6/12 mesi su una poly è implausibile: nel file è un "non misurato"
            "tl6": tl6_raw or None,
            "tl12": tl12_raw or None,
        },
    }


def load_rows(rows):
    groups = OrderedDict()
    for r in rows:
        if not r or r[0] is None or r[1] is None:
            continue
        key = (normalize_brand(r[0]), normalize_model(r[1]), normalize_gauge(r[2]))
        groups.setdefault(key, []).append(r)
    out = []
    for key, grp in groups.items():
        rec = _build(key, grp)
        if rec:
            out.append(rec)
    return out


def load_excel(path):
    import openpyxl
    ws = openpyxl.load_workbook(path, data_only=True, read_only=True).active
    return load_rows(list(ws.iter_rows(min_row=2, values_only=True)))


if __name__ == "__main__":
    recs = load_excel(sys.argv[1])
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        json.dump(recs, f, ensure_ascii=False, indent=1)
    counts = {}
    for r in recs:
        counts[r["brand"]] = counts.get(r["brand"], 0) + 1
    print(len(recs), "corde in ambito:", counts)
