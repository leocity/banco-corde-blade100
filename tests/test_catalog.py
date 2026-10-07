from pipeline.catalog import add_catalog_only, missing_from

RECS = [{"id": "toroline-o-toro-17", "brand": "Toroline", "model": "O-Toro", "gauge_label": "17", "gauge_mm": 1.23}]


def test_new_item_becomes_catalog_only_record():
    cat = [{"brand": "Toroline", "model": "Snap TF", "gauge_label": "16L", "gauge_mm": 1.25, "shape": "RND",
            "material": "copoly", "source_url": "https://toroline.com/x"}]
    out = add_catalog_only(list(RECS), cat)
    new = [r for r in out if r.get("catalog_only")]
    assert len(new) == 1 and new[0]["coverage"] == 0 and new[0]["is_target"] is True
    assert new[0]["excel"] is None and new[0]["twu"] is None and new[0]["rpedia"] is None
    assert new[0]["shape"] == "RND" and new[0]["shape_source"] == "https://toroline.com/x"


def test_existing_item_with_other_label_same_mm_not_duplicated():
    cat = [{"brand": "Toroline", "model": "O-TORO", "gauge_label": "1.23", "gauge_mm": 1.23, "shape": "HEX",
            "material": "copoly", "source_url": "https://toroline.com/o"}]
    assert len(add_catalog_only(list(RECS), cat)) == 1


def test_missing_from_is_empty_after_add():
    cat = [{"brand": "Re-String", "model": "Hype", "gauge_label": "17", "gauge_mm": 1.23, "shape": None,
            "material": "copoly", "source_url": "https://shoprestring.com/h"}]
    out = add_catalog_only(list(RECS), cat)
    assert missing_from(out, cat) == []
    assert missing_from(RECS, cat) != []


def test_colour_variants_are_not_new_products():
    recs = [{"id": "toroline-wasabi-green-17", "brand": "Toroline", "model": "Wasabi Green", "gauge_label": "17", "gauge_mm": 1.23},
            {"id": "toroline-wasabi-x-blue-17", "brand": "Toroline", "model": "Wasabi X Blue", "gauge_label": "17", "gauge_mm": 1.23}]
    cat = [{"brand": "Toroline", "model": "Wasabi", "gauge_label": "17", "gauge_mm": 1.23, "shape": "SQ", "material": "copoly", "source_url": "https://t/w"},
           {"brand": "Toroline", "model": "Wasabi X", "gauge_label": "17", "gauge_mm": 1.23, "shape": "RND", "material": "copoly", "source_url": "https://t/x"}]
    assert len(add_catalog_only(recs, cat)) == 2


def test_verified_shapes_and_exclusions_win():
    from pipeline.catalog import clean_catalog
    cat = [{"brand": "Grapplesnake", "model": "Tour Sniper", "gauge_label": "17", "gauge_mm": 1.20, "shape": "HEX", "material": "copoly", "source_url": "https://g/p"},
           {"brand": "Grapplesnake", "model": "Tour Sniper", "gauge_label": "16", "gauge_mm": 1.30, "shape": "HEX", "material": "copoly", "source_url": "https://g/p"}]
    shapes = [{"brand": "Grapplesnake", "model": "Tour Sniper", "shape": "PENT", "source": "https://g/info"}]
    exclude = [{"brand": "Grapplesnake", "model": "Tour Sniper", "gauge_mm": 1.20, "reason": "diametro non esistente"}]
    out = clean_catalog(cat, shapes, exclude)
    assert len(out) == 1 and out[0]["shape"] == "PENT" and out[0]["source_url"] == "https://g/info"
