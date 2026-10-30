"""Recensioni e punteggi dei tester: validazione e aggregazione pesata per tipo di fonte (spec v2 §4)."""
import re

CRITERIA = ("spin", "comfort", "control", "power", "durability")
LEVEL_CRITERIA = CRITERIA + ("stiffness",)
KIND_WEIGHT = {"lab_playtest": 1.0, "review": 0.8, "forum": 0.6, "video": 0.5, "brand": 0.4}


def validate_reviews(rows, ids):
    errs = []
    got = {r["id"] for r in rows}
    for i in sorted(set(ids) - got):
        errs.append(f"manca la riga recensioni per {i}")
    for r in rows:
        for s in r.get("sources", []):
            where = f"{r['id']} / {s.get('site')}"
            if not str(s.get("url") or "").startswith("http"):
                errs.append(f"{where}: url mancante")
            if s.get("kind") not in KIND_WEIGHT:
                errs.append(f"{where}: kind non valido {s.get('kind')!r}")
            for k, v in (s.get("scores") or {}).items():
                if v is not None and not (0 <= v <= 100):
                    errs.append(f"{where}: punteggio {k}={v} fuori 0–100")
            for k, v in (s.get("levels") or {}).items():
                if v is not None and v not in (1, 2, 3, 4, 5):
                    errs.append(f"{where}: livello {k}={v} fuori 1–5")
    return errs


def _wmean(pairs):
    pairs = [(v, w) for v, w in pairs if v is not None]
    den = sum(w for _, w in pairs)
    return sum(v * w for v, w in pairs) / den if den else None


def _value(s, c):
    """Valore 0–100 di una fonte per un criterio: punteggio se c'è, altrimenti livello 1–5 -> 0–100."""
    sc = (s.get("scores") or {}).get(c)
    if sc is not None:
        return sc
    lv = (s.get("levels") or {}).get(c)
    return None if lv is None else (lv - 1) * 25


def aggregate(row):
    srcs = row.get("sources") or []
    w = lambda s: KIND_WEIGHT.get(s.get("kind"), 0.5)
    return {
        "score": {c: _wmean([((s.get("scores") or {}).get(c), w(s)) for s in srcs]) for c in CRITERIA},
        "level": {c: _wmean([((s.get("levels") or {}).get(c), w(s)) for s in srcs]) for c in LEVEL_CRITERIA},
        "raw": {c: _wmean([(_value(s, c), w(s)) for s in srcs]) for c in LEVEL_CRITERIA},
        # affidabilità: somma dei pesi delle fonti che si esprimono sul criterio (un playtest = 1, il produttore = 0,4)
        "wsum": {c: round(sum(w(s) for s in srcs if _value(s, c) is not None), 2) for c in LEVEL_CRITERIA},
        "n_sources": len(srcs),
    }


def add_percentiles(aggs):
    """I voti dei tester diventano percentili tra le corde recensite, sulla stessa scala dei dati di laboratorio."""
    # voti numerici e giudizi a livelli stanno su scale diverse: i numeri si confrontano solo tra numeri,
    # un livello 1–5 diventa direttamente il percentile 0/25/50/75/100
    for c in LEVEL_CRITERIA:
        pop = [a["score"][c] for a in aggs.values() if c in a["score"] and a["score"][c] is not None]
        for a in aggs.values():
            v = a["score"].get(c) if c in a["score"] else None
            if v is not None and pop:
                pct = round((sum(x < v for x in pop) + 0.5 * sum(x == v for x in pop)) / len(pop) * 100, 1)
            else:
                lv = a["level"].get(c)
                pct = None if lv is None else round((lv - 1) * 25, 1)
            a.setdefault("pct", {})[c] = pct
    return aggs


# Note che dichiarano una recensione scritta per un altro calibro: non deve generare conflitti con i dati misurati.
GAUGE_MISMATCH_RE = re.compile(r"gauge (is )?not stated|applied to this id|nearby|different gauge|other gauge", re.I)
CONFLICT_CRITERIA = ("spin", "durability", "stiffness")


def mark_gauge_mismatch(sources, overrides=None):
    """Copia delle fonti con `gauge_mismatch`; `overrides` = {sito: bool} vince sul riconoscimento dalle note."""
    overrides = overrides or {}
    out = []
    for s in sources:
        flag = overrides[s.get("site")] if s.get("site") in overrides else bool(GAUGE_MISMATCH_RE.search(s.get("note") or ""))
        out.append({**s, "gauge_mismatch": flag})
    return out


def review_conflicts(sources, lab_levels, threshold=2):
    """Dove i tester (livello 1–5) si discostano di `threshold` o più livelli dal laboratorio. Ignora le fonti con calibro diverso."""
    usable = [s for s in sources if not s.get("gauge_mismatch")]
    raw = aggregate({"sources": usable})["raw"]
    out = []
    for c in CONFLICT_CRITERIA:
        lab, tester = lab_levels.get(c), raw.get(c)
        if lab is None or tester is None:
            continue
        level = tester / 25 + 1
        if abs(level - lab) >= threshold:
            out.append({"criterion": c, "testers": round(level, 1), "lab": lab,
                        "sites": [s["site"] for s in usable if _value(s, c) is not None]})
    return out
