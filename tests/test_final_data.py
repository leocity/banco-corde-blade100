"""Controlli sul dataset finale (data/strings.json): la validazione del pairing sui dati veri (spec §5)."""
import json
import pathlib

import pytest

PATH = pathlib.Path(__file__).resolve().parent.parent / "data" / "strings.json"
pytestmark = pytest.mark.skipif(not PATH.exists(), reason="data/strings.json non generato")
DATA = json.loads(PATH.read_text(encoding="utf-8")) if PATH.exists() else {"strings": []}
BY_ID = {r["id"]: r for r in DATA["strings"]}
SCORES = {i: r["derived"]["pairing"]["score"] for i, r in BY_ID.items() if r["derived"]["pairing"]["score"] is not None}


def below(i):
    """Quota delle corde con pairing strettamente più basso."""
    return sum(s < SCORES[i] for s in SCORES.values()) / len(SCORES)


def test_zero_123_has_pairing_and_values():
    r = BY_ID["re-string-zero-17"]
    d, p = r["derived"]["dims"], r["derived"]["pairing"]
    assert p["score"] is not None and p["no_spin"] is True
    for k in ("stiffness", "durability", "elasticity"):
        assert d[k] is not None, k
    assert d["spin"] is None


def test_no_ottimo_without_three_dims():
    assert not [i for i, r in BY_ID.items() if r["derived"]["pairing"]["band"] == "Ottimo" and r["derived"]["pairing"]["n_dims"] < 3]


def test_pairing_discriminates():
    ottimo = sum(1 for r in BY_ID.values() if r["derived"]["pairing"]["band"] == "Ottimo")
    assert ottimo / len(SCORES) <= 0.2, (ottimo, len(SCORES))  # senza il controllo le dimensioni sono 4: poco meno selettivo, ma ancora lontano dal «tutto Ottimo»


def test_rpm_blast_in_bottom_decile():
    for i in ("babolat-rpm-blast-16", "babolat-rpm-blast-17"):
        assert below(i) <= 0.10, (i, SCORES[i], below(i))


def test_disliked_not_in_top_quartile():
    for i in DATA["defaults"]["disliked"]:
        if i in SCORES:
            assert below(i) < 0.75, (i, SCORES[i], below(i))


def test_defaults_ids_exist():
    d = DATA["defaults"]
    for i in [d["equipped"]["id"], *d["liked"], *d["disliked"]]:
        assert i in BY_ID, i


def test_conflicts_shape():
    for r in BY_ID.values():
        for c in r["reviews"]["conflicts"]:
            assert set(c) == {"criterion", "testers", "lab", "sites"} and c["sites"]


def test_displayed_durability_word_matches_the_computed_dimension():
    for i, r in BY_ID.items():
        d, j = r["derived"]["dims"]["durability"], r["derived"]["judgments"]["durability"]
        if d is None:
            continue
        assert j["level"] == min(5, int(d // 20) + 1), (i, d, j["word"])


def test_no_control_index_anywhere():
    import json
    data = json.load(open("data/strings.json", encoding="utf-8"))
    for r in data["strings"]:
        assert "control" not in r["derived"]["dims"] and "control_range" not in r["derived"], r["id"]
        assert "control" not in r["derived"]["pairing"]["fits"], r["id"]


def test_index_validation_is_published_with_n():
    import json
    v = json.load(open("data/strings.json", encoding="utf-8"))["estimates_meta"]["index_validation"]
    assert set(v) >= {"comfort", "stiffness", "spin", "durability"} and "power" not in v and "control" not in v
    assert all(x["n"] >= 0 for x in v.values())
