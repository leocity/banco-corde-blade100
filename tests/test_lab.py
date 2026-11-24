"""Blocco `lab` (v6, §5.1): solo misure vere, valori identici alle sorgenti, mai stime."""
import json
import pathlib

import pytest

from pipeline.lab import lab_block, lab_meta

SOURCES = {"twu": {"fetched": "2026-10-28", "url": "https://twu/r"}, "racketpedia": {"fetched": "2026-10-27", "url": "https://rp"},
           "excel": {"file": "chart.xlsx", "modified": "2026-08-26"}}
ROOT = pathlib.Path(__file__).resolve().parent.parent


def rec(match="exact", rp_match="exact", excel=True, **kw):
    r = {"id": "x",
         "twu": {"twu_name": "B M", "match": match, "ref_tension_lbs": 51, "swing": "Fast", "stiffness_lbin": 217.4,
                 "tension_loss_pct": 44.1, "spin_potential": 8.1},
         "rpedia": {"static_stiffness_kgmm": 0.75, "url": "https://rp/x", "match": rp_match},
         "excel": {"stretch_pct": {"50": 3.289}, "recover_pct": {"50": 0.533}, "static_24h_creep": 1.2} if excel else None,
         "stiffness": {"value_lbin": 999.0, "kind": "modello"}, "spin": {"value": 99.0, "kind": "modello"}}
    r.update(kw)
    return r


def test_exact_values_copied_from_sources():
    b = lab_block(rec(), SOURCES)
    assert b["twu"] == {"stiffness": 217.4, "loss": 44.1, "spin": 8.1, "ref_lbs": 51, "date": "2026-10-28", "url": "https://twu/r"}
    assert b["rp"] == {"kgmm": 0.75, "date": "2026-10-27", "url": "https://rp/x"}
    assert b["excel"] == {"stretch50": 3.289, "recover50": 0.533, "creep24": 1.2, "date": "2026-08-26"}


@pytest.mark.parametrize("m", ["proxy", "probable", None])
def test_non_exact_matches_excluded(m):
    b = lab_block(rec(match=m, rp_match=m), SOURCES)
    assert b["twu"] is None and b["rp"] is None


def test_estimates_never_leak():
    b = lab_block(rec(), SOURCES)
    assert "999.0" not in json.dumps(b) and "99.0" not in json.dumps(b)


def test_missing_fields_are_null():
    r = rec()
    r["twu"]["spin_potential"] = None
    r["rpedia"]["static_stiffness_kgmm"] = None
    r["excel"]["static_24h_creep"] = None
    b = lab_block(r, SOURCES)
    assert b["twu"]["spin"] is None and b["rp"] is None and b["excel"]["creep24"] is None


def test_no_excel_no_block():
    assert lab_block(rec(excel=False), SOURCES)["excel"] is None


def test_missing_source_date_falls_back_to_none():
    assert lab_block(rec(), {})["twu"]["date"] is None


def test_lab_meta():
    rs = [rec(), rec(), rec(match="proxy", rp_match=None, excel=False)]
    rs[1]["excel"]["stretch_pct"] = {"50": 4.289}
    m = lab_meta([dict(r, lab=lab_block(r, SOURCES)) for r in rs])
    assert m["n"] == {"twu": 2, "rp": 2, "excel": 2}
    assert m["excel_stretch50_sd"] == pytest.approx(0.7071, abs=1e-3)


def test_built_data_matches_raw_sources():
    d = json.loads((ROOT / "data" / "strings.json").read_text(encoding="utf-8"))
    for s in d["strings"]:
        t = (s.get("lab") or {}).get("twu")
        if t:
            assert s["twu"]["match"] == "exact" and t["stiffness"] == s["twu"]["stiffness_lbin"]
        else:
            assert (s["twu"] or {}).get("match") != "exact"
    assert d["lab_meta"]["n"] == {"twu": 55, "rp": 60, "excel": 44}


def test_est_only_where_measure_missing_and_always_labelled():
    import json
    data = json.loads((pathlib.Path(__file__).resolve().parent.parent / "data/strings.json").read_text(encoding="utf-8"))
    S = {r["id"]: r for r in data["strings"]}
    for r in data["strings"]:
        lab = r["lab"]
        for key, e in lab["est"].items():
            src, field = key.split(".")
            if lab.get("twu_flag") and src == "twu":
                continue  # TWU contestato: la misura resta in lab.twu (la pagina la mostra), est dà l'alternativa senza TWU
            assert not (lab.get(src) and lab[src].get(field if src != "rp" else "kgmm") is not None), (r["id"], key)
            assert e["kind"] in ("ricavata", "modello") and e["how"] and e["v"] is not None, (r["id"], key)
    slap = S["re-string-slap-17"]["lab"]["est"]
    assert slap["twu.stiffness"]["kind"] == "ricavata" and slap["twu.stiffness"]["from"] == "rp"
    assert slap["twu.spin"]["kind"] == "modello"
    conf = S["solinco-confidential-16l"]["lab"]["est"]
    assert conf["twu.loss"]["v"] == 22.2 and conf["twu.stiffness"]["from"] == "twu"
    assert S["toroline-enso-pro-neon-yl-16l"]["lab"]["est"]["rp.kgmm"]["kind"] == "ricavata"  # scheda di altro colore


def test_loss_available_for_every_string_and_physics_is_declared():
    import json
    data = json.loads((pathlib.Path(__file__).resolve().parent.parent / "data/strings.json").read_text(encoding="utf-8"))
    lm = data["lab_meta"]["loss_model"]
    assert lm["n"] >= 100 and lm["b"] < 0  # le poly più rigide perdono meno tensione
    for r in data["strings"]:
        lab = r["lab"]
        has = (lab.get("twu") or {}).get("loss") is not None or "twu.loss" in lab["est"]
        assert has, r["id"]
    S = {r["id"]: r for r in data["strings"]}
    assert S["toroline-o-toro-tour-1-20"]["lab"]["est"]["twu.loss"]["v"] == 25.0  # stesso modello, misurato a 1,23
    assert "fisica" in S["re-string-slap-17"]["lab"]["est"]["twu.loss"]["how"]
