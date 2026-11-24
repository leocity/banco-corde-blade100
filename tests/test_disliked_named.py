"""Le varianti solo catalogo di un modello non gradito (Confidential Soft 16 e 17) vanno segnalate per nome."""
from pipeline.derive import derive_all
from tests.test_derive_v2 import lab


def catalog_variant(model, label, gauge, brand="Solinco"):
    return {"id": f"{brand.lower()}-{model.lower().replace(' ', '-')}-{label}", "brand": brand, "model": model, "gauge_mm": gauge,
            "shape": "SQ", "preference": None, "is_target": True, "twu": None, "excel": None, "rpedia": None,
            "catalog_only": True, "coverage": 0, "spin": None, "stiffness": None}


def derived(extra):
    recs = [lab(i) for i in range(10)] + extra
    recs[0]["id"] = "solinco-confidential-16l"  # serve un'ancora per la tensione suggerita
    derive_all(recs, {})
    return {r["id"]: r["derived"] for r in recs}


def test_catalog_only_variants_of_a_disliked_model_are_flagged_by_name():
    d = derived([catalog_variant("Confidential Soft", "17", 1.2), catalog_variant("Confidential Soft", "16", 1.3),
                 catalog_variant("RPM Blast", "17", 1.25, "Babolat")])
    for rid in ("solinco-confidential-soft-17", "solinco-confidential-soft-16", "babolat-rpm-blast-17"):
        assert d[rid]["disliked_warning"] is True, rid
        assert d[rid]["disliked_reason"] == "modello", rid


def test_other_models_are_not_flagged_and_reason_is_none():
    d = derived([catalog_variant("Confidential", "17", 1.2)])
    assert d["solinco-confidential-17"]["disliked_warning"] is False
    assert d["solinco-confidential-17"]["disliked_reason"] is None


def test_reference_strings_are_never_flagged_by_name():
    liked = catalog_variant("Confidential Soft", "16l", 1.25)
    liked["preference"] = "liked"
    d = derived([liked])
    assert d["solinco-confidential-soft-16l"]["disliked_warning"] is False
