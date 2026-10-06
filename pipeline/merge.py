"""Fusione Excel + TWU + Racketpedia in un record per corda (spec §5, modello dati)."""
import json

from pipeline.scope import is_target

LIKED = {"solinco-confidential-16l", "toroline-o-toro-17"}
DISLIKED_MODELS = {("Solinco", "Confidential Soft"), ("Babolat", "RPM Blast")}
SHAPE_WORDS = {"round": "RND", "hexagonal": "HEX", "pentagonal": "PENT", "square": "SQ",
               "octagonal": "OCT", "heptagonal": "HEP", "triangular": "TRI", "star": "STAR",
               "twisted": "TWST", "gear": "GEAR"}


def _preference(rec):
    if rec["id"] in LIKED:
        return "liked"
    if (rec["brand"], rec["model"]) in DISLIKED_MODELS:
        return "disliked"
    return None


def merge(excel, twu, matches, rpedia):
    ex_by_id = {e["id"]: e for e in excel}
    tw_by_name = {t["twu_name"]: t for t in twu}
    rp_by_id = {r["id"]: r for r in rpedia}
    out = []
    for m in matches:
        e = ex_by_id.get(m["id"])
        t = tw_by_name.get(m["twu_name"]) if m["match"] != "none" else None
        src = e or t
        rp = rp_by_id.get(m["id"])
        has_rp = bool(rp and rp.get("static_stiffness_kgmm") is not None)
        gauge_mm = t["gauge_mm"] if t and m["match"] == "exact" and t.get("gauge_mm") else src.get("gauge_mm")
        shape = (e or {}).get("shape") or SHAPE_WORDS.get(str((rp or {}).get("shape") or "").lower())
        rec = {
            "id": m["id"],
            "brand": src["brand"],
            "model": src["model"],
            "gauge_label": src["gauge_label"],
            "gauge_mm": gauge_mm,
            "shape": shape,
            "material": e["material"] if e else "poly",
            "is_target": is_target(src["brand"], src["model"]),
            "excel": e["excel"] if e else None,
            "twu": None if not t else {
                "twu_name": t["twu_name"], "match": m["match"], "note": m.get("note", ""),
                "ref_tension_lbs": t["ref_tension_lbs"], "swing": t["swing"],
                "stiffness_lbin": t["stiffness_lbin"], "tension_loss_pct": t["tension_loss_pct"],
                "spin_potential": t["spin_potential"],
            },
            "rpedia": None if not has_rp else {
                "static_stiffness_kgmm": rp["static_stiffness_kgmm"], "url": rp["url"],
                "shape": rp.get("shape"), "composition": rp.get("composition"), "match": rp["match"],
            },
        }
        rec["preference"] = _preference(rec)
        rec["coverage"] = sum(x is not None for x in (rec["excel"], rec["twu"], rec["rpedia"]))
        out.append(rec)
    return out


def apply_crosscheck(records, cc):
    """Forme dichiarate dai produttori (vincono sul file Excel, che resta in shape_excel) ed esito del controllo web."""
    shapes = {(s["brand"], s["model"]): s for s in cc.get("shapes", [])}
    checks = cc.get("checks", {})
    for r in records:
        s = shapes.get((r["brand"], r["model"]))
        r["shape_excel"] = (r.get("excel") and r.get("shape")) or None
        if s:
            r["shape"] = s["shape"]
            r["shape_source"] = s["source"]
        r["crosscheck"] = checks.get(r["id"])
    return records


def _load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


if __name__ == "__main__":
    recs = merge(_load("data/raw/excel.json"), _load("data/raw/twu.json"),
                 _load("data/agents/matches.json"), _load("data/agents/rpedia.json"))
    recs = apply_crosscheck(recs, _load("data/crosscheck_overrides.json"))
    with open("data/merged.json", "w", encoding="utf-8") as f:
        json.dump(recs, f, ensure_ascii=False, indent=1)
    cov = {}
    for r in recs:
        cov[r["coverage"]] = cov.get(r["coverage"], 0) + 1
    print(len(recs), "record; copertura:", dict(sorted(cov.items())))
    print("ancore:", [(r["id"], r["preference"]) for r in recs if r["preference"]])
