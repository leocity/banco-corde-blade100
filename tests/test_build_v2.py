from pipeline.build import build


def lab(i):
    return {"id": f"b-m{i}-17", "brand": "B", "model": f"M{i}", "gauge_label": "17", "gauge_mm": 1.25, "shape": "RND",
            "material": "copoly", "preference": None, "is_target": True, "coverage": 2,
            "twu": {"twu_name": f"B M{i} 17", "match": "exact", "ref_tension_lbs": 51, "swing": "Fast",
                    "stiffness_lbin": 170.0 + 8 * i, "tension_loss_pct": 20.0 + 3 * i, "spin_potential": 4.0 + 0.6 * i},
            "excel": None, "rpedia": {"static_stiffness_kgmm": 0.8 + 0.04 * i, "match": "exact", "url": "https://r", "shape": None, "composition": None}}


def rev(i, spin):
    return {"id": f"b-m{i}-17", "sources": [{"site": "tw", "url": "https://tw/x", "kind": "lab_playtest",
            "scores": {"spin": spin, "comfort": None, "control": None, "power": None, "durability": None},
            "levels": {"spin": None, "comfort": None, "control": None, "power": None, "durability": None, "stiffness": None},
            "note": ""}]}


def test_build_adds_catalog_estimates_and_meta():
    recs = [lab(i) for i in range(10)]
    recs[0]["id"] = "solinco-confidential-16l"
    catalog = [{"brand": "B", "model": "Nuova", "gauge_label": "17", "gauge_mm": 1.23, "shape": "HEX",
                "material": "copoly", "source_url": "https://b.com/n"}]
    reviews = [rev(i, 40 + 6 * i) for i in range(1, 10)] + [
        {"id": "b-nuova-17", "sources": [{"site": "tw", "url": "https://tw/n", "kind": "lab_playtest",
         "scores": {"spin": 88, "comfort": 70, "control": None, "power": None, "durability": None},
         "levels": {"spin": None, "comfort": None, "control": None, "power": None, "durability": None, "stiffness": 2},
         "note": ""}]}]
    out = build(recs, {}, reviews=reviews, catalog=catalog)
    S = {r["id"]: r for r in out["strings"]}
    assert S["b-nuova-17"]["catalog_only"] is True
    assert S["b-nuova-17"]["spin"] is None  # recensioni escluse dai calcoli (decisione utente 2026-10-07)
    assert S["b-m3-17"]["spin"]["kind"] == "misurato"
    assert out["estimates_meta"]["spin_calibration"]["n"] >= 5
    assert "rp_to_twu" in out["estimates_meta"]
    assert S["b-nuova-17"]["reviews"]["sources"][0]["url"] == "https://tw/n"
    assert "comfort" not in S["b-nuova-17"]["derived"]["judgments"]  # comfort era una stima dalla rigidità: tolto


def test_build_exposes_defaults():
    recs = [lab(i) for i in range(10)]
    recs[0]["id"] = "solinco-confidential-16l"
    out = build(recs, {})
    assert out["defaults"]["equipped"] == {"id": "re-string-slap-17", "kg": [22, 21]}
    # solo id esistenti: le altre preferite/non gradite non sono in questo campione
    assert out["defaults"]["liked"] == ["solinco-confidential-16l"]
    assert out["defaults"]["disliked"] == []


def test_real_defaults_all_exist_and_are_complete():
    import json
    d = json.load(open("data/strings.json", encoding="utf-8"))
    ids = {r["id"] for r in d["strings"]}
    assert d["defaults"]["equipped"]["id"] in ids
    assert d["defaults"]["liked"] == ["solinco-confidential-16l", "toroline-o-toro-17", "re-string-zero-17", "re-string-slap-17"]
    assert len(d["defaults"]["disliked"]) == 6 and set(d["defaults"]["disliked"]) <= ids


def test_build_adds_review_conflicts_and_gauge_flags():
    recs = [lab(i) for i in range(10)]
    recs[0]["id"] = "solinco-confidential-16l"
    mism = rev(2, 50)
    mism["sources"][0].update(site="rp", note="Gauge not stated on page; applied to this id")
    reviews = [rev(1, 95), mism]
    S = {r["id"]: r for r in build(recs, {}, reviews=reviews, review_overrides={})["strings"]}
    c = S["b-m1-17"]["reviews"]["conflicts"]
    assert [x["criterion"] for x in c] == ["spin"] and c[0]["lab"] == 1 and c[0]["testers"] > 4
    assert S["b-m2-17"]["reviews"]["sources"][0]["gauge_mismatch"] is True
    assert S["b-m2-17"]["reviews"]["conflicts"] == []
    assert S["b-m3-17"]["reviews"]["conflicts"] == []
