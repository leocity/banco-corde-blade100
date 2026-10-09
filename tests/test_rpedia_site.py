import pathlib

from pipeline.estimate import base_model
from pipeline.rpedia_site import _norm, apply_site, colours_of, match_rows, model_key, parse_brand_page

FIX = pathlib.Path(__file__).parent / "fixtures" / "rp_brand.html"


def site_rows():
    rows = parse_brand_page(FIX.read_text(encoding="utf-8"))
    for r in rows:
        r["brand"] = "Re-String"
        r["model_key"] = model_key(r["name"], {"restring"})
    return rows


def rec(id_, model, mm, rp=None):
    return {"id": id_, "brand": "Re-String", "model": model, "gauge_mm": mm, "rpedia": rp}


def test_parse_brand_page_extracts_name_gauge_stiffness_and_url():
    rows = parse_brand_page(FIX.read_text(encoding="utf-8"))
    assert [r["kgmm"] for r in rows] == [1.05, 1.1, 0.85, 0.95]
    assert rows[0]["gauge_mm"] == 1.23 and rows[0]["shape"] == "hexagonal" and rows[0]["url"].endswith("restring-zero-sky-blue-123")


def test_model_key_drops_brand_colour_and_gauge():
    assert model_key("ReString Zero Sky Blue 123", {"restring"}) == "zero"
    assert model_key("Toroline Wasabi Neon Green 123", {"toroline"}) == "wasabi"


def test_exact_needs_same_gauge_proxy_otherwise():
    rows = site_rows()
    exact = match_rows([rec("a", "Zero", 1.28)], rows, base_model)[0]
    proxy = match_rows([rec("b", "Zero", 1.30)], rows, base_model)[0]
    assert exact["match"] == "exact" and exact["static_stiffness_kgmm"] == 1.1
    assert proxy["match"] == "proxy" and proxy["static_stiffness_kgmm"] == 1.1  # calibro più vicino


def test_colour_twin_is_proxy_not_exact():
    rows = site_rows()
    twin = match_rows([rec("c", "Zero pink", 1.23)], rows, base_model)[0]
    assert twin["match"] == "proxy" and colours_of("Zero pink") == {"pink"}


def test_apply_site_fixes_wrong_gauge_and_keeps_unlisted_exact():
    rows = site_rows()
    wrong = rec("s", "Sync", 1.25, {"url": rows[2]["url"], "static_stiffness_kgmm": 0.85, "match": "exact"})  # riga 1,20
    unlisted = rec("u", "Zero", 1.23, {"url": "https://www.racketpedia.com/en-GB/tennis-string/altro", "static_stiffness_kgmm": 9.9, "match": "exact"})
    log = apply_site([wrong, unlisted], rows, base_model)
    assert wrong["rpedia"]["static_stiffness_kgmm"] == 0.95 and wrong["rpedia"]["match"] == "exact"
    assert unlisted["rpedia"]["static_stiffness_kgmm"] == 9.9
    assert [x[0] for x in log] == ["s"]


def test_apply_site_verifies_value_by_url():
    rows = site_rows()
    r = rec("z", "Zero", 1.23, {"url": rows[0]["url"], "static_stiffness_kgmm": 1.5, "match": "exact"})
    apply_site([r], rows, base_model)
    assert r["rpedia"]["static_stiffness_kgmm"] == 1.05
