"""derived.hybrid_role: profilo main (verticali) o cross (orizzontali) da Racketpedia, forma ed Excel; mai TWU, mai nel punteggio."""
import json
import pathlib

from pipeline.derive import REQUIRED_FOR_SCORE, derive_all
from pipeline.hybrid_role import SHAPE_MAIN, hybrid_role, role_populations
from tests.test_derive_v2 import lab

ROOT = pathlib.Path(__file__).resolve().parent.parent


def rec(i, kgmm=None, shape="RND", excel=None, twu=None):
    return {"id": f"h{i}", "brand": "B", "model": f"H{i}", "shape": shape, "twu": twu,
            "rpedia": {"match": "exact", "static_stiffness_kgmm": kgmm} if kgmm is not None else None, "excel": excel}


def ex(stretch, recover, creep):
    return {"stretch_pct": {"50": stretch}, "recover_pct": {"50": recover}, "static_24h_creep": creep, "stiff_index_avg": 2.0, "tl6": 10.0}


POP = [rec(i, 0.6 + 0.07 * i, "RND", ex(2.0 + 0.5 * i, 0.2 + 0.1 * i, 0.15 + 0.03 * i)) for i in range(10)]
HP = role_populations(POP)


def test_shape_scale_goes_from_round_to_sharp():
    assert SHAPE_MAIN["RND"] < SHAPE_MAIN["HEX"] < SHAPE_MAIN["PENT"] <= SHAPE_MAIN["SQ"]


def test_stiff_sharp_string_is_a_main():
    r = hybrid_role(rec(20, 1.2, "SQ"), HP)
    assert r["role"] == "main" and r["score"] > 0.25


def test_soft_round_string_with_good_recovery_is_a_cross():
    r = hybrid_role(rec(21, 0.5, "RND", ex(2.0, 4.0, 0.15)), HP)
    assert r["role"] == "cross" and r["confidence"] in ("alta", "media")
    assert {b["signal"] for b in r["basis"]} >= {"rigidità a riposo", "forma", "elasticità"}


def test_conflicting_signals_give_a_flexible_role_and_list_the_conflict():
    r = hybrid_role(rec(22, 1.2, "RND"), HP)  # rigida ma tonda
    assert r["role"] == "flessibile"
    assert r["conflicts"] and "forma" in r["conflicts"][0]


def test_excel_only_string_has_a_role_with_low_confidence():
    r = hybrid_role(rec(23, None, "HEX", ex(2.0, 4.0, 0.15)), HP)
    assert r["role"] in ("main", "cross", "flessibile") and r["confidence"] == "bassa"
    assert not any(b["signal"] == "rigidità a riposo" for b in r["basis"])


def test_not_assessable_without_two_independent_signals():
    assert hybrid_role(rec(24, None, "RND"), HP)["role"] == "non valutabile"
    assert hybrid_role(rec(25, None, None), HP)["role"] == "non valutabile"
    assert hybrid_role(rec(26, 1.0, None), HP)["role"] == "non valutabile"


def test_proxy_racketpedia_is_ignored():
    r = rec(27, 1.2, "SQ", ex(2.0, 0.3, 0.2)); r["rpedia"]["match"] = "proxy"
    assert not any(b["signal"] == "rigidità a riposo" for b in hybrid_role(r, HP)["basis"])


def test_twu_never_changes_the_role_and_the_score_rule_is_untouched():
    a = rec(28, 0.8, "HEX", ex(3.0, 1.0, 0.2))
    b = rec(28, 0.8, "HEX", ex(3.0, 1.0, 0.2), twu={"match": "exact", "stiffness_lbin": 300.0, "tension_loss_pct": 10.0, "spin_potential": 9.0})
    assert hybrid_role(a, HP) == hybrid_role(b, HP)
    assert REQUIRED_FOR_SCORE == ("spin", "durability")


def test_derive_all_adds_hybrid_role_without_touching_profile_score():
    recs = [lab(i) for i in range(10)]
    recs[0]["id"] = "solinco-confidential-16l"
    derive_all(recs, {})
    assert all("hybrid_role" in r["derived"] for r in recs)
    scores = [r["derived"]["profile_score"] for r in recs]
    again = [lab(i) for i in range(10)]
    again[0]["id"] = "solinco-confidential-16l"
    derive_all(again, {})
    assert scores == [r["derived"]["profile_score"] for r in again]


def test_built_data_classifies_strings_without_twu():
    S = json.loads((ROOT / "data/strings.json").read_text(encoding="utf-8"))["strings"]
    by = {r["id"]: r["derived"]["hybrid_role"] for r in S}
    for i in ("re-string-slap-17", "re-string-zero-17", "toroline-caviar-17", "toroline-wasabi-green-17", "toroline-enso-pro-16"):
        assert by[i]["role"] != "non valutabile", i
    no_twu = [r for r in S if not r["lab"]["twu"]]
    assessable = [r for r in no_twu if by[r["id"]]["role"] != "non valutabile"]
    assert len(assessable) >= 40, (len(assessable), len(no_twu))
    assert by["re-string-slap-17"]["role"] in ("cross", "flessibile")  # la Slap è la più morbida a riposo del gruppo
    assert all(by[r["id"]]["confidence"] in ("alta", "media", "bassa", None) for r in S)
