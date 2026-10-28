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
    assert S["b-nuova-17"]["derived"]["judgments"]["comfort"]["score"] is None


def test_model_id_groups_colours_and_keeps_families():
    from pipeline.estimate import model_id
    assert model_id("Kirschbaum", "Flash Black") == model_id("Kirschbaum", "Flash Orange") == "kirschbaum-flash"
    assert model_id("Solinco", "Confidential") != model_id("Solinco", "Confidential Soft")
    assert model_id("Toroline", "O-Toro") != model_id("Toroline", "O-Toro Tour")
    out = build([lab(i) for i in range(6)], {})
    assert all(r["model_id"] == model_id(r["brand"], r["model"]) for r in out["strings"])
