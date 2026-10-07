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
    assert out["removed_discontinued"] == [{"name": "B M3", "successor": "M4", "reason": "fuori produzione"}]


YEARS = [
    {"brand": "Solinco", "model_key": "hyper g", "year": 2017, "confidence": "exact", "evidence": "", "urls": ["https://y"]},
    {"brand": "Luxilon", "model_key": "x", "year": 2016, "confidence": "upper_bound", "evidence": "", "urls": ["https://z"]},
    {"brand": "Babolat", "model_key": "rpm blast", "year": 2011, "confidence": "exact", "evidence": "", "urls": ["https://w"]},
]


def test_outdated_before_2020_removed_including_upper_bound():
    kept, removed = filter_discontinued(RECS, [], keep_ids={"babolat-rpm-blast-17"}, years=YEARS, cutoff=2020)
    ids = {r["id"] for r in kept}
    assert "solinco-hyper-g-16l" not in ids and "luxilon-x-17" not in ids
    assert "babolat-rpm-blast-17" in ids  # corda di riferimento
    assert next(r for r in removed if r["id"] == "solinco-hyper-g-16l")["production"]["reason"] == "uscita nel 2017"


def test_unknown_year_kept_and_flagged():
    kept, _ = filter_discontinued(RECS, [], keep_ids=set(), years=YEARS, cutoff=2020)
    r = next(r for r in kept if r["id"] == "solinco-revolution-16l")
    assert r["production"]["year"] is None
