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
