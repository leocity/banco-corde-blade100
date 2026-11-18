"""P6: recensioni indipendenti dall'audit D §4: validatore e inserimento in strings[i].indep_reviews."""
import json
import pathlib

from pipeline.build import build
from pipeline.reviews_indep import CLASSES, validate_indep
from tests.test_build_v2 import lab

ROOT = pathlib.Path(__file__).resolve().parent.parent
IDS = {"a", "b"}


def row(**kw):
    r = {"string_id": "a", "url": "https://www.youtube.com/watch?v=X", "channel": "TK Tennis", "class": "indipendente",
         "date": "≈2026-05", "kind": "video", "verified_by_viewing": False, "phrase": None, "gauge_unknown": False}
    r.update(kw)
    return r


def test_valid_row_passes():
    assert validate_indep([row()], IDS) == []
    assert CLASSES == {"indipendente", "indipendente con riserva", "non verificabile", "con affiliazioni", "commerciale"}


def test_rejects_bad_rows():
    assert validate_indep([row(url="http://x.com/a")], IDS)
    assert validate_indep([row(url="ftp://x")], IDS)
    assert validate_indep([row(**{"class": "ottimo"})], IDS)
    assert validate_indep([row(string_id="zzz")], IDS)
    assert validate_indep([row(date="maggio")], IDS)
    assert validate_indep([row(), row()], IDS)  # duplicato stessa corda+url


def test_unviewed_review_has_no_phrase():
    assert validate_indep([row(phrase="bella corda")], IDS)  # frase senza visione: vietata
    assert validate_indep([row(verified_by_viewing=True, phrase="ok")], IDS) == []


def test_build_attaches_reviews_to_strings():
    recs = [lab(i) for i in range(3)]
    recs[0]["id"] = "a"
    out = {r["id"]: r for r in build(recs, {}, indep=[row(string_id="a")])["strings"]}
    assert out["a"]["indep_reviews"] == [row(string_id="a")]
    assert all(r["indep_reviews"] == [] for i, r in out.items() if i != "a")


def test_real_file():
    rows = json.loads((ROOT / "data/reviews_indep.json").read_text(encoding="utf-8"))
    d = json.loads((ROOT / "data/strings.json").read_text(encoding="utf-8"))
    ids = {s["id"] for s in d["strings"]}
    assert validate_indep(rows, ids) == []
    assert rows and all(r["verified_by_viewing"] is False and r["phrase"] is None for r in rows)
    assert sum(len(s["indep_reviews"]) for s in d["strings"]) == len(rows)
