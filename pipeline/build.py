"""merged.json + catalogo + recensioni + stime + metriche derivate + note -> data/strings.json (spec v1 §5–6, v2 §3–5)."""
import datetime
import glob
import json
import math
import pathlib

from pipeline.validate_indices import index_validation
from pipeline.community import FORUM_ALIASES, build_community
from pipeline.catalog import add_catalog_only, add_extra, apply_rpedia_fixes, clean_catalog
from pipeline.derive import ANCHOR_TENSIONS, DEFAULT_DISLIKED, DEFAULT_EQUIPPED, DEFAULT_LIKED, DEFAULT_WEIGHTS, derive_all
from pipeline.estimate import (MEASURED, base_model, model_id, backtest_qualitative, calibrate_tester_spin, estimate_spin, check_gauge_usrsa, fit_spin_model, fit_gauge_model, fit_stiffness_model, siblings_with_rp,
                               estimate_stiffness, fit_linear, loo_mae, relatives_of, tester_level)
from pipeline.lab import fill_loss, lab_block, lab_meta
from pipeline.notes_gen import apply_notes
from pipeline.rpedia_site import apply_site
from pipeline.production import filter_discontinued
from pipeline.provenance import apply_provenance
from pipeline.reviews_indep import validate_indep
from pipeline.twuflag import quarantine_twu, restore_twu
from pipeline.reviews import add_percentiles, aggregate, mark_gauge_mismatch, review_conflicts, validate_reviews

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


def build(records, notes, reviews=None, catalog=None, production=None, years=None, site_rows=None, review_overrides=None, forum=None, sources=None, usrsa=None,
          indep=None, extra=None):
    records = add_extra(records, extra)
    records = add_catalog_only(records, catalog or [])
    keep = REFERENCE_IDS | {r["id"] for r in records if r.get("preference")}
    records, removed = filter_discontinued(records, production or [], keep, years=years, cutoff=2020)
    # Racketpedia dal sito (fonte primaria): verifica, riempie e corregge gli abbinamenti scritti dall'agente
    rp_log = apply_site(records, site_rows or [], base_model) if site_rows else []
    apply_rpedia_fixes(records, extra)  # dopo il sito: le schede trovate a mano hanno l'ultima parola
    # corde con verdetto «contradicted»: il loro TWU non entra in stime (nemmeno come gemello), punteggio e tensione
    twu_stash = quarantine_twu(records)
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
    if usrsa and gauge_model.get("slope") is not None:
        gauge_model["usrsa"] = check_gauge_usrsa(usrsa, gauge_model["slope"])
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
        r["model_id"] = model_id(r["brand"], r["model"])

    # giudizi e punteggi solo dal laboratorio; le recensioni restano in r["reviews"] come link informativi
    discriminant = derive_all(records)
    restore_twu(records, twu_stash)  # il dato TWU resta nel record e in `lab`: la pagina lo mostra ancora
    for r in records:  # conflitti tester/dati: solo contro livelli di laboratorio misurati (o da gemello)
        j = r["derived"]["judgments"]
        lvl = lambda c: (j.get(c) or {}).get("level")
        lab = {"spin": lvl("spin") if (r.get("spin") or {}).get("kind") in ("misurato", "parente") else None,
               "stiffness": lvl("stiffness") if (r.get("stiffness") or {}).get("kind") in ("misurata", "parente") else None,
               "durability": lvl("durability")}
        r["reviews"]["sources"] = mark_gauge_mismatch(r["reviews"]["sources"], (review_overrides or {}).get(r["id"]))
        r["reviews"]["conflicts"] = review_conflicts(r["reviews"]["sources"], lab)
    apply_notes(records, notes)
    apply_provenance(records, sources or {}, None)
    for r in records:
        r["lab"] = lab_block(r, sources or {})
        r["indep_reviews"] = [x for x in (indep or []) if x["string_id"] == r["id"]]
    loss_model = fill_loss(records, _load("data/raw/twu.json", []) or [])
    comm = build_community(forum or [], records, aliases=FORUM_ALIASES)
    for r in records:
        r["community"] = comm.get(r["id"])
    index_check = index_validation(records)
    ids = {r["id"] for r in records}
    twu_refs = {(r["twu"]["ref_tension_lbs"], r["twu"]["swing"]) for r in records if r["twu"]}
    ref = ", ".join(f"{t} lbs swing {'veloce' if s == 'Fast' else s}" for t, s in sorted(twu_refs))
    return {
        "generated": datetime.date.today().isoformat(),
        "sources": sources or {},
        # verifiche fatte a mano sulle fonti (recuperato dalla pagina online: era l'unica copia)
        "verified": {k: v for k, v in (_load("data/verified.json", {}) or {}).items() if not k.startswith("_")} or None,
        "weights_default": DEFAULT_WEIGHTS,
        # pendenza della tensione (kg per lb/in) ricavata dalle due preferite: la pagina la usa partendo dalla corda attuale
        "tension_slope_kg_per_lbin": next((r["derived"]["tension_start"]["slope_kg_per_lbin"] for r in records
                                           if (r.get("derived") or {}).get("tension_start")), None),
        "anchors": ANCHOR_TENSIONS,
        "lab_meta": {**lab_meta(records), "loss_model": loss_model},
        "defaults": {"equipped": DEFAULT_EQUIPPED, "liked": [i for i in DEFAULT_LIKED if i in ids], "disliked": [i for i in DEFAULT_DISLIKED if i in ids]},
        "discriminant": discriminant,
        "insight": notes.get("_insight", ""),
        "guide": {"twu_ref": ref},
        "estimates_meta": {"spin_calibration": calib, "spin_qualitative": qual, "rp_to_twu": rp_meta, "spin_model": spin_model,
                           "stiffness_gauge": gauge_model, "stiffness_model": stiff_model, "index_validation": index_check,
                           "rpedia_site": {"rows": len(site_rows or []), "changes": [list(x) for x in rp_log]}},
        "removed_discontinued": [{"name": n, "successor": sc, "reason": rs} for n, sc, rs in removed_list],
        "strings": records,
    }


def _load(p, default=None):
    p = ROOT / p
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else default


def skip_pending(site_rows, pending):
    """Le righe Racketpedia nuove ancora da rivedere (data/pending_matches.json) non si abbinano a nessuna corda."""
    skip = {p["url"] for p in pending if p.get("source") == "racketpedia"}
    return [r for r in site_rows if r["url"] not in skip]


def build_from_repo():
    """Stesse fonti di `python3 -m pipeline.build`, senza scrivere: serve anche a refresh e ai test di regressione."""
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
    site_rows = skip_pending(_load("data/raw/racketpedia.json", []), _load("data/pending_matches.json", []))
    indep = _load("data/reviews_indep.json", [])
    usrsa = (_load("data/raw/usrsa_trupro.json", {}) or {}).get("rows")
    out = build(records, notes, reviews=reviews, catalog=catalog, production=production, years=years, site_rows=site_rows,
                 review_overrides=_load("data/agents/review_overrides.json", {}),
                 forum=[json.loads(pathlib.Path(f).read_text(encoding="utf-8")) for f in sorted(glob.glob(str(ROOT / "data/agents/forum_*.json")))],
                 sources=_load("data/raw/sources.json", {}), usrsa=usrsa, indep=indep,
                 extra=_load("data/catalog_extra.json", {}))
    errs = validate_indep(indep, {r["id"] for r in out["strings"]})
    if errs:
        raise SystemExit("recensioni indipendenti non valide: " + "; ".join(errs))
    return out


if __name__ == "__main__":
    site_rows = _load("data/raw/racketpedia.json", [])
    out = build_from_repo()
    print("Racketpedia dal sito:", len(site_rows), "righe;", len(out["estimates_meta"]["rpedia_site"]["changes"]), "abbinamenti nuovi o corretti")
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
