"""Provenienza di ogni numero mostrato (spec v3 §5.4): fonte, data di scaricamento, condizioni, tipo, margine, link."""
import datetime
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCES_PATH = ROOT / "data" / "raw" / "sources.json"
MEASURED = ("exact", "probable")


def record_source(key, url=None, file=None, modified=None, path=SOURCES_PATH, today=None):
    """Aggiorna la data di una fonte in sources.json senza toccare le altre. Per l'Excel: nome e data del file."""
    path = pathlib.Path(path)
    data = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    data[key] = {"file": file, "modified": modified} if file else {"fetched": today or datetime.date.today().isoformat(), "url": url}
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")


def _half(o):
    return round((o["high"] - o["low"]) / 2, 2) if o.get("low") is not None and o.get("high") is not None else None


def _twu(sources, key="twu"):
    s = sources.get(key) or {}
    return s.get("fetched"), s.get("url")


def _conditions(t):
    return f"{t.get('ref_tension_lbs')} lbs, swing {'veloce' if t.get('swing') == 'Fast' else t.get('swing')}" if t else None


STIFF = {
    "misurata": ("TWU", "misurato"),
    "parente": ("TWU", "da calibro gemello, corretto per il diametro"),
    "da Racketpedia": ("Racketpedia", "da Racketpedia convertita"),
    "modello": ("stima dal calibro", "stima da modello"),
}
SPIN = {
    "misurato": ("TWU", "misurato"),
    "parente": ("TWU", "da calibro o colore gemello"),
    "modello": ("stima da rigidità e forma", "stima da modello"),
}


def provenance(rec, sources, meta):
    out = {}
    t = rec.get("twu")
    tw_date, tw_url = _twu(sources)
    st = rec.get("stiffness")
    if st:
        source, kind = STIFF.get(st["kind"], (st["kind"], st["kind"]))
        if st.get("via") == "gemello":
            kind = "da Racketpedia di un calibro gemello, corretta per il diametro"
        if source == "TWU":
            out["stiffness"] = {"source": source, "fetched": tw_date, "conditions": _conditions(t), "kind": kind,
                                "margin": None if st["kind"] == "misurata" else _half(st), "url": tw_url}
        elif source == "Racketpedia":
            rp_date, rp_url = _twu(sources, "racketpedia")
            out["stiffness"] = {"source": source, "fetched": rp_date, "conditions": "rigidità statica (carico lento), convertita sulla scala TWU",
                                "kind": kind, "margin": _half(st), "url": (rec.get("rpedia") or {}).get("url") or rp_url}
        else:
            out["stiffness"] = {"source": source, "fetched": None, "conditions": None, "kind": kind, "margin": _half(st), "url": None}
    sp = rec.get("spin")
    if sp and sp.get("value") is not None:
        source, kind = SPIN.get(sp["kind"], (sp["kind"], sp["kind"]))
        is_twu = source == "TWU"
        out["spin"] = {"source": source, "fetched": tw_date if is_twu else None, "conditions": _conditions(t) if is_twu else None,
                       "kind": kind, "margin": None if sp["kind"] == "misurato" else _half(sp), "url": tw_url if is_twu else None}
    if t and t.get("tension_loss_pct") is not None:
        out["tension_loss"] = {"source": "TWU", "fetched": tw_date, "conditions": _conditions(t),
                               "kind": "misurato" if t.get("match") in MEASURED else "da calibro gemello", "margin": None, "url": tw_url}
    cmp_date, cmp_url = _twu(sources, "twu_compare")
    for field, key in (("energy_return", "energy_return_pct"), ("cof_string_string", "cof_string_string"), ("cof_string_ball", "cof_string_ball")):
        if t and t.get(key) is not None:
            out[field] = {"source": "TWU Compare", "fetched": cmp_date, "conditions": _conditions(t), "kind": "misurato", "margin": None,
                          "url": cmp_url}
    if rec.get("excel"):
        ex = sources.get("excel") or {}
        out["excel"] = {"source": f"Test Ektelon (tuo file {ex.get('file') or ''})".replace(" )", ")"), "fetched": ex.get("modified"),
                        "conditions": "trazione 40–65 lbs su un tratto di 11,25″", "kind": "misurato", "margin": None, "url": None}
    return out


def apply_provenance(records, sources, meta):
    for r in records:
        r["prov"] = provenance(r, sources, meta)
