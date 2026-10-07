"""Decisione utente 2026-10-07: le recensioni non entrano nei calcoli, restano solo come link informativi."""
from tests.test_build_v2 import lab, rev
from pipeline.build import build


def _recs():
    recs = [lab(i) for i in range(10)]
    recs[0]["id"] = "solinco-confidential-16l"
    return recs


CAT = [{"brand": "B", "model": "Nuova", "gauge_label": "17", "gauge_mm": 1.23, "shape": "HEX",
        "material": "copoly", "source_url": "https://b.com/n"}]
REV_NEW = {"id": "b-nuova-17", "sources": [{"site": "tw", "url": "https://tw/n", "kind": "lab_playtest",
           "scores": {"spin": 88, "comfort": 70, "control": None, "power": None, "durability": None},
           "levels": {"spin": None, "comfort": None, "control": None, "power": None, "durability": None, "stiffness": 2},
           "note": ""}]}


def test_reviews_do_not_change_scores_of_measured_strings():
    with_rev = {r["id"]: r for r in build(_recs(), {}, reviews=[rev(i, 40 + 6 * i) for i in range(1, 10)])["strings"]}
    without = {r["id"]: r for r in build(_recs(), {}, reviews=[])["strings"]}
    for i in with_rev:
        assert with_rev[i]["derived"]["profile_score"] == without[i]["derived"]["profile_score"]
        assert with_rev[i]["derived"]["judgments"] == without[i]["derived"]["judgments"]


def test_catalog_only_with_reviews_has_no_judgments_but_keeps_links():
    S = {r["id"]: r for r in build(_recs(), {}, reviews=[REV_NEW], catalog=CAT)["strings"]}
    r = S["b-nuova-17"]
    assert r["spin"] is None and r["derived"]["profile_score"] is None
    assert all(j["score"] is None for j in r["derived"]["judgments"].values())
    assert r["reviews"]["sources"][0]["url"] == "https://tw/n"
