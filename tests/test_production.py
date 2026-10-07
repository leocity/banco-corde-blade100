from pipeline.production import filter_discontinued

RECS = [
    {"id": "solinco-revolution-16l", "brand": "Solinco", "model": "Revolution"},
    {"id": "solinco-hyper-g-16l", "brand": "Solinco", "model": "Hyper-G"},
    {"id": "toroline-toro-toro-pink-17", "brand": "Toroline", "model": "Toro Toro Pink"},
    {"id": "babolat-rpm-blast-17", "brand": "Babolat", "model": "RPM Blast"},
    {"id": "luxilon-x-17", "brand": "Luxilon", "model": "X"},
]
STATUS = [
    {"brand": "Solinco", "model_key": "revolution", "status": "discontinued", "successor": None, "evidence": "", "urls": ["https://a"]},
    {"brand": "Solinco", "model_key": "hyper g", "status": "current", "successor": None, "evidence": "", "urls": ["https://b"]},
    {"brand": "Toroline", "model_key": "toro toro", "status": "discontinued", "successor": None, "evidence": "", "urls": ["https://c"]},
    {"brand": "Babolat", "model_key": "rpm blast", "status": "discontinued", "successor": None, "evidence": "", "urls": ["https://d"]},
    {"brand": "Luxilon", "model_key": "x", "status": "unclear", "successor": None, "evidence": "", "urls": ["https://e"]},
]


def test_discontinued_removed_colour_variants_included():
    kept, removed = filter_discontinued(RECS, STATUS, keep_ids=set())
    ids = {r["id"] for r in kept}
    assert "solinco-revolution-16l" not in ids and "toroline-toro-toro-pink-17" not in ids
    assert "solinco-hyper-g-16l" in ids and len(removed) == 3


def test_reference_strings_are_never_removed():
    kept, _ = filter_discontinued(RECS, STATUS, keep_ids={"babolat-rpm-blast-17"})
    r = next(r for r in kept if r["id"] == "babolat-rpm-blast-17")
    assert r["production"]["status"] == "discontinued"


def test_unclear_kept_with_status():
    kept, _ = filter_discontinued(RECS, STATUS, keep_ids=set())
    assert next(r for r in kept if r["id"] == "luxilon-x-17")["production"]["status"] == "unclear"


def test_build_removes_discontinued_and_lists_them():
    from tests.test_build_v2 import lab
    from pipeline.build import build
    recs = [lab(i) for i in range(10)]
    recs[0]["id"] = "solinco-confidential-16l"
    status = [{"brand": "B", "model_key": "m3", "status": "discontinued", "successor": "M4", "evidence": "", "urls": ["https://x"]}]
    out = build(recs, {}, production=status)
    ids = {r["id"] for r in out["strings"]}
    assert "b-m3-17" not in ids and "solinco-confidential-16l" in ids
    assert out["removed_discontinued"] == [{"name": "B M3", "successor": "M4"}]
