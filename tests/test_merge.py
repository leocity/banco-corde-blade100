from pipeline.merge import merge

EX = [
    {"id": "solinco-confidential-16l", "brand": "Solinco", "model": "Confidential", "gauge_label": "16L",
     "gauge_mm": 1.25, "shape": "RND", "material": "copoly", "excel": {"tl6": 15.0}},
    {"id": "re-string-zero-16", "brand": "Re-String", "model": "Zero", "gauge_label": "16",
     "gauge_mm": 1.30, "shape": "HEX", "material": "copoly", "excel": {"tl6": 20.0}},
    {"id": "toroline-o-toro-17", "brand": "Toroline", "model": "O-Toro", "gauge_label": "17",
     "gauge_mm": 1.20, "shape": "HEX", "material": "copoly", "excel": {"tl6": 18.0}},
]
TW = [
    {"id": "solinco-confidential-16", "twu_name": "Solinco Confidential 16 (1.30)", "brand": "Solinco",
     "model": "Confidential", "gauge_label": "16", "gauge_mm": 1.30, "ref_tension_lbs": 51, "swing": "Fast",
     "material": "Polyester", "stiffness_lbin": 222.3, "tension_loss_pct": 22.2, "spin_potential": 6.4},
    {"id": "toroline-o-toro-17", "twu_name": "Toroline O-Toro 17 (1.23)", "brand": "Toroline",
     "model": "O-Toro", "gauge_label": "17", "gauge_mm": 1.23, "ref_tension_lbs": 51, "swing": "Fast",
     "material": "Polyester", "stiffness_lbin": 165.7, "tension_loss_pct": 44.4, "spin_potential": 9.4},
    {"id": "babolat-rpm-blast-16", "twu_name": "Babolat RPM Blast 16", "brand": "Babolat",
     "model": "RPM Blast", "gauge_label": "16", "gauge_mm": 1.30, "ref_tension_lbs": 51, "swing": "Fast",
     "material": "Polyester", "stiffness_lbin": 232.6, "tension_loss_pct": 45.9, "spin_potential": 4.5},
]
MA = [
    {"id": "solinco-confidential-16l", "twu_name": "Solinco Confidential 16 (1.30)", "match": "proxy", "note": ""},
    {"id": "re-string-zero-16", "twu_name": None, "match": "none", "note": ""},
    {"id": "toroline-o-toro-17", "twu_name": "Toroline O-Toro 17 (1.23)", "match": "exact", "note": ""},
    {"id": "solinco-confidential-16", "twu_name": "Solinco Confidential 16 (1.30)", "match": "exact", "note": ""},
    {"id": "babolat-rpm-blast-16", "twu_name": "Babolat RPM Blast 16", "match": "exact", "note": ""},
]
RP = [{"id": "solinco-confidential-16l", "url": "https://www.racketpedia.com/en-GB/tennis-string/solinco-confidential-black-125",
       "static_stiffness_kgmm": 1.2, "shape": "round", "composition": "copolyester", "match": "exact"}]


def _recs():
    return {r["id"]: r for r in merge(EX, TW, MA, RP)}


def test_confidential_anchor_is_liked_proxy_with_coverage():
    r = _recs()["solinco-confidential-16l"]
    assert r["twu"]["match"] == "proxy" and r["preference"] == "liked"
    assert r["coverage"] == 3 and r["rpedia"]["static_stiffness_kgmm"] == 1.2


def test_no_twu_for_restring():
    r = _recs()["re-string-zero-16"]
    assert r["twu"] is None and r["rpedia"] is None and r["coverage"] == 1


def test_twu_only_record_and_disliked():
    r = _recs()["babolat-rpm-blast-16"]
    assert r["excel"] is None and r["twu"]["stiffness_lbin"] == 232.6
    assert r["preference"] == "disliked" and r["is_target"] is True


def test_exact_twu_mm_overrides_nominal():
    assert _recs()["toroline-o-toro-17"]["gauge_mm"] == 1.23


def test_ids_unique():
    ids = [r["id"] for r in merge(EX, TW, MA, RP)]
    assert len(ids) == len(set(ids))


def test_integration_on_real_files():
    import json, pathlib
    p = pathlib.Path(__file__).resolve().parent.parent / "data" / "merged.json"
    recs = {r["id"]: r for r in json.loads(p.read_text(encoding="utf-8"))}
    assert recs["solinco-confidential-16l"]["twu"]["match"] == "proxy"
    assert recs["solinco-confidential-16l"]["rpedia"]["static_stiffness_kgmm"] == 1.0
    assert recs["re-string-zero-16"]["twu"] is None
    assert recs["grapplesnake-tour-m8-17"]["excel"] is None
    assert recs["toroline-o-toro-17"]["twu"]["stiffness_lbin"] == 165.7
    assert len(recs) == len(json.loads(p.read_text(encoding="utf-8")))
