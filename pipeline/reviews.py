"""Recensioni e punteggi dei tester: validazione e aggregazione pesata per tipo di fonte (spec v2 §4)."""

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


def aggregate(row):
    srcs = row.get("sources") or []
    w = lambda s: KIND_WEIGHT.get(s.get("kind"), 0.5)
    return {
        "score": {c: _wmean([((s.get("scores") or {}).get(c), w(s)) for s in srcs]) for c in CRITERIA},
        "level": {c: _wmean([((s.get("levels") or {}).get(c), w(s)) for s in srcs]) for c in LEVEL_CRITERIA},
        "n_sources": len(srcs),
    }
