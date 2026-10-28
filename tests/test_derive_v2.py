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


def test_catalog_only_with_reviews_does_not_crash_and_is_reviews_only():
    recs = [lab(i) for i in range(10)] + [catalog_only()]
    recs[0]["id"] = "solinco-confidential-16l"  # serve un'ancora per la tensione suggerita
    derive_all(recs)
    j = recs[-1]["derived"]["judgments"]
    assert set(j) == {"stiffness", "spin", "durability"}  # niente controllo/comfort stimati, niente quota recensioni
    assert all(x["score"] is None for x in j.values())
    assert recs[-1]["derived"]["tension_start"]["kg"]


def test_estimated_spin_does_not_shift_measured_percentiles():
    base = [lab(i) for i in range(10)]
    p1 = subscores(base[3], population(base))["spin"]
    est = lab(20, spin_kind="tester")
    p2 = subscores(base[3], population(base + [est]))["spin"]
    assert p1 == p2


def test_stiffness_judgment_words_are_descriptive():
    rec = lab(9)
    pop = population([lab(i) for i in range(10)])
    j = judgments(rec, subscores(rec, pop), pop)
    assert j["stiffness"]["word"] in ("rigida", "molto rigida")




def test_scores_unchanged_by_v3_cleanup():
    """Regressione: togliere controllo/comfort stimati e il codice 70/30 non cambia nessun punteggio."""
    import json
    import pathlib
    from pipeline.build import build_from_repo
    import pytest
    fix = json.loads((pathlib.Path(__file__).parent / "fixtures" / "scores_before_v3.json").read_text(encoding="utf-8"))
    root = pathlib.Path(__file__).resolve().parent.parent
    if json.loads((root / "data" / "raw" / "sources.json").read_text(encoding="utf-8")) != fix["sources"]:
        pytest.skip("dati aggiornati dopo la pulizia v3: i punteggi possono cambiare per motivi legittimi")
    after = {r["id"]: r["derived"]["profile_score"] for r in build_from_repo()["strings"]}
    assert after == fix["scores"]
