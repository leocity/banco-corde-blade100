from pipeline.derive import derive_all, judgments, population, subscores


def lab(i, spin_kind="misurato"):
    st, sp = 170.0 + 8 * i, 4.0 + 0.6 * i
    return {"id": f"b-m{i}-17", "brand": "B", "model": f"M{i}", "gauge_mm": 1.25, "shape": "RND", "preference": None,
            "is_target": True,
            "twu": {"match": "exact", "stiffness_lbin": st, "tension_loss_pct": 20.0 + 3 * i, "spin_potential": sp},
            "excel": {"stiff_index_avg": 2.0 + 0.2 * i, "stretch_pct": {"50": 5.0 - 0.2 * i}, "tl6": 10.0 + i},
            "rpedia": None,
            "spin": {"value": sp, "low": sp, "high": sp, "kind": spin_kind, "basis_n": 1},
            "stiffness": {"value_lbin": st, "low": st, "high": st, "kind": "misurata"}}


def catalog_only():
    return {"id": "b-new-17", "brand": "B", "model": "New", "gauge_mm": 1.23, "shape": None, "preference": None,
            "is_target": True, "twu": None, "excel": None, "rpedia": None, "catalog_only": True, "coverage": 0,
            "spin": {"value": 8.0, "low": 7.0, "high": 9.0, "kind": "qualitativo", "basis_n": 1},
            "stiffness": None}


REV_NEW = {"score": {"spin": 80.0, "comfort": 70.0, "control": None, "power": 60.0, "durability": None},
           "level": {"spin": 4.0, "comfort": None, "control": 3.0, "power": None, "durability": 2.0, "stiffness": 2.0},
           "n_sources": 2}


def test_catalog_only_with_reviews_does_not_crash_and_is_reviews_only():
    recs = [lab(i) for i in range(10)] + [catalog_only()]
    recs[0]["id"] = "solinco-confidential-16l"  # serve un'ancora per la tensione suggerita
    derive_all(recs, {"b-new-17": REV_NEW})
    j = recs[-1]["derived"]["judgments"]
    assert j["spin"]["lab_share"] == 0  # stima qualitativa = dai tester, non conta come laboratorio
    assert j["control"]["lab_share"] == 0 and j["control"]["score"] == 50.0
    assert recs[-1]["derived"]["tension_start"]["kg"]


def test_mix_is_70_lab_30_reviews():
    rec = lab(5)
    pop = population([lab(i) for i in range(10)])
    sub = subscores(rec, pop)
    agg = {"score": {"spin": 90.0, "comfort": None, "control": None, "power": None, "durability": None},
           "level": {k: None for k in ("spin", "comfort", "control", "power", "durability", "stiffness")}, "n_sources": 1}
    j = judgments(rec, sub, agg, pop)
    assert round(j["spin"]["score"], 1) == round(0.7 * sub["spin"] + 0.3 * 90.0, 1)
    assert j["spin"]["lab_share"] == 0.7


def test_estimated_spin_does_not_shift_measured_percentiles():
    base = [lab(i) for i in range(10)]
    p1 = subscores(base[3], population(base))["spin"]
    est = lab(20, spin_kind="tester")
    p2 = subscores(base[3], population(base + [est]))["spin"]
    assert p1 == p2


def test_stiffness_judgment_words_are_descriptive():
    rec = lab(9)
    pop = population([lab(i) for i in range(10)])
    j = judgments(rec, subscores(rec, pop), None, pop)
    assert j["stiffness"]["word"] in ("rigida", "molto rigida")
