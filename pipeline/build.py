"""merged.json + catalogo + recensioni + stime + metriche derivate + note -> data/strings.json (spec v1 §5–6, v2 §3–5)."""
import datetime
import glob
import json
import math
import pathlib

from pipeline.catalog import add_catalog_only, clean_catalog
from pipeline.derive import ANCHOR_TENSIONS, DEFAULT_WEIGHTS, derive_all
from pipeline.estimate import (MEASURED, backtest_qualitative, calibrate_tester_spin, estimate_spin, fit_spin_model, fit_gauge_model, fit_stiffness_model, siblings_with_rp,
                               estimate_stiffness, fit_linear, loo_mae, relatives_of, tester_level)
from pipeline.notes_gen import apply_notes
from pipeline.production import filter_discontinued
from pipeline.reviews import add_percentiles, aggregate, validate_reviews

ROOT = pathlib.Path(__file__).resolve().parent.parent


def _measured(r, field):
    t = r.get("twu") or {}
    return t.get(field) if t.get("match") in MEASURED else None


def _corr(xs, ys):
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    sx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    sy = math.sqrt(sum((y - my) ** 2 for y in ys))
    return round(sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / (sx * sy), 2) if sx and sy else None


REFERENCE_IDS = {"solinco-confidential-16l", "toroline-o-toro-17"}


def build(records, notes, reviews=None, catalog=None, production=None, years=None):
    records = add_catalog_only(records, catalog or [])
    keep = REFERENCE_IDS | {r["id"] for r in records if r.get("preference")}
    records, removed = filter_discontinued(records, production or [], keep, years=years, cutoff=2020)
    removed_list = sorted({(f"{r['brand']} {r['model']}", (r.get("production") or {}).get("successor"),
                            (r.get("production") or {}).get("reason")) for r in removed})
    agg = add_percentiles({row["id"]: aggregate(row) for row in (reviews or [])})
    src = {row["id"]: row.get("sources", []) for row in (reviews or [])}

    # calibrazione tester -> spin TWU (solo corde con spin misurato e punteggio tester numerico)
    pairs = [(agg[r["id"]]["score"]["spin"], _measured(r, "spin_potential")) for r in records
             if r["id"] in agg and agg[r["id"]]["score"]["spin"] is not None and _measured(r, "spin_potential") is not None]
    calib = calibrate_tester_spin(pairs)

    # Racketpedia statica -> scala TWU (coppie esatte)
    rp = [((r.get("rpedia") or {}).get("static_stiffness_kgmm"), _measured(r, "stiffness_lbin")) for r in records
          if (r.get("rpedia") or {}).get("match") == "exact"]
    rp = [(x, y) for x, y in rp if x is not None and y is not None]
    rp_meta = None
    if len(rp) >= 5:
        xs, ys = [p[0] for p in rp], [p[1] for p in rp]
        a, b = fit_linear(xs, ys)
        rp_meta = {"a": round(a, 2), "b": round(b, 2), "mae": round(loo_mae(xs, ys), 1), "n": len(rp), "r": _corr(xs, ys)}

    spin_pop = [v for v in (_measured(r, "spin_potential") for r in records) if v is not None]
    qpairs = [(tester_level(agg.get(r["id"])), _measured(r, "spin_potential")) for r in records if r["id"] in agg]
    qual = backtest_qualitative([(l, y) for l, y in qpairs if l is not None and y is not None], spin_pop)
    stiff_pop = [v for v in (_measured(r, "stiffness_lbin") for r in records) if v is not None]
    rp_args = (rp_meta["a"], rp_meta["b"], rp_meta["mae"]) if rp_meta else None
    gauge_model = fit_gauge_model(records)
    # modello della rigidità dal solo calibro: nessun giudizio personale dei tester
    stiff_model = fit_stiffness_model([(r.get("gauge_mm"), _measured(r, "stiffness_lbin")) for r in records
                                       if _measured(r, "stiffness_lbin") is not None])
    for r in records:
        r["stiffness"] = estimate_stiffness(r, relatives_of(r, records), rp_args, None, stiff_pop, gauge=gauge_model, model=stiff_model,
                                            rp_siblings=siblings_with_rp(r, records))
    # modello dello spin da rigidità + forma, addestrato solo su corde con spin e rigidità misurati da TWU
    train = [((r["stiffness"] or {}).get("value_lbin") if (r["stiffness"] or {}).get("kind") == "misurata" else None,
              r.get("shape"), _measured(r, "spin_potential")) for r in records if _measured(r, "spin_potential") is not None]
    spin_model = fit_spin_model(train)
    for r in records:
        rel = relatives_of(r, records)
        # solo dati di laboratorio (decisione utente 2026-10-07): le recensioni non entrano nelle stime
        r["spin"] = estimate_spin(r, rel, None, calib, spin_pop, model=spin_model, stiffness=r["stiffness"])
        r["reviews"] = {"agg": agg.get(r["id"]),
                        "sources": [{k: s.get(k) for k in ("site", "url", "kind", "scores", "levels", "note")}
                                    for s in src.get(r["id"], [])]}
        r.setdefault("catalog_only", False)

    # giudizi e punteggi solo dal laboratorio; le recensioni restano in r["reviews"] come link informativi
    discriminant = derive_all(records)
    apply_notes(records, notes)
    twu_refs = {(r["twu"]["ref_tension_lbs"], r["twu"]["swing"]) for r in records if r["twu"]}
    ref = ", ".join(f"{t} lbs swing {'veloce' if s == 'Fast' else s}" for t, s in sorted(twu_refs))
    return {
        "generated": datetime.date.today().isoformat(),
        "weights_default": DEFAULT_WEIGHTS,
        "anchors": ANCHOR_TENSIONS,
        "discriminant": discriminant,
        "insight": notes.get("_insight", ""),
        "guide": {"twu_ref": ref},
        "estimates_meta": {"spin_calibration": calib, "spin_qualitative": qual, "rp_to_twu": rp_meta, "spin_model": spin_model,
                           "stiffness_gauge": gauge_model, "stiffness_model": stiff_model},
        "removed_discontinued": [{"name": n, "successor": sc, "reason": rs} for n, sc, rs in removed_list],
        "strings": records,
    }


def _load(p, default=None):
    p = ROOT / p
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else default


if __name__ == "__main__":
    records = _load("data/merged.json")
    notes = _load("data/notes.json", {})
    reviews = [row for f in sorted(glob.glob(str(ROOT / "data/agents/reviews_r*.json")))
               for row in json.loads(pathlib.Path(f).read_text(encoding="utf-8"))]
    errs = validate_reviews(reviews, {r["id"] for r in reviews})
    if errs:
        raise SystemExit("recensioni non valide: " + "; ".join(errs))
    cc = _load("data/crosscheck_overrides.json", {"shapes": []})
    catalog = clean_catalog(_load("data/agents/catalog.json", []), cc.get("shapes", []),
                            _load("data/catalog_fixes.json", {"exclude": []})["exclude"])
    production = [row for f in sorted(glob.glob(str(ROOT / "data/agents/prod_p*.json")))
                  for row in json.loads(pathlib.Path(f).read_text(encoding="utf-8-sig"))]
    years = [row for f in sorted(glob.glob(str(ROOT / "data/agents/year_p*.json")))
             for row in json.loads(pathlib.Path(f).read_text(encoding="utf-8-sig"))]
    out = build(records, notes, reviews=reviews, catalog=catalog, production=production, years=years)
    print("rimosse:", [(x["name"], x["reason"]) for x in out["removed_discontinued"]])
    (ROOT / "data" / "strings.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    S = out["strings"]
    kinds = {}
    for r in S:
        k = (r["spin"] or {}).get("kind")
        kinds[k] = kinds.get(k, 0) + 1
    print(len(S), "corde; spin per tipo:", kinds, "| solo catalogo:", sum(r["catalog_only"] for r in S))
    print("calibrazione spin:", out["estimates_meta"]["spin_calibration"])
    print("fascia qualitativa:", out["estimates_meta"]["spin_qualitative"])
    print("Racketpedia -> TWU:", out["estimates_meta"]["rp_to_twu"])
