from pipeline.derive import (discriminant_metrics, percentile, population, profile_score,
                             similarity, subscores, tension_start)


def rec(i, st, tl, sp, si, shape="RND", pref=None):
    return {"id": f"r{i}", "shape": shape, "preference": pref,
            "twu": {"stiffness_lbin": st, "tension_loss_pct": tl, "spin_potential": sp},
            "excel": {"stiff_index_avg": si, "stretch_pct": {"50": 8.0 - i / 10}, "tl6": 10.0 + i},
            "rpedia": None}


POP_RECS = [rec(i, 170 + 8 * i, 20 + 3 * i, 4 + 0.5 * i, 3 + 0.4 * i) for i in range(10)]
POP = population(POP_RECS)


def test_percentile_basic_and_none():
    assert percentile(None, [1, 2, 3]) is None
    assert percentile(2, [1, 2, 3]) == 50.0


def test_similarity_identity():
    assert similarity(POP_RECS[3], POP_RECS[3], POP) == 100


def test_similarity_needs_two_shared_features():
    a = {"shape": "RND", "twu": None, "excel": {"stiff_index_avg": 4.0}}
    assert similarity(a, POP_RECS[1], POP) is None


def test_similarity_decreases_with_distance():
    assert similarity(POP_RECS[0], POP_RECS[1], POP) > similarity(POP_RECS[0], POP_RECS[9], POP)


def test_profile_score_disliked_penalty():
    sub = {"spin": 60, "control": 50, "durability": 70, "power": 40}
    assert profile_score(sub, disliked_sim=50) - profile_score(sub, disliked_sim=80) == 15


def test_profile_score_renormalizes_missing():
    assert profile_score({"spin": 72, "control": None, "durability": None, "power": None}) == 72


def test_subscores_control_power_inverse_and_comfort():
    s = subscores(POP_RECS[9], POP)
    assert s["control"] > s["power"] and s["spin"] > 50 and s["comfort"] < 50


ANCHORS = [{"id": "solinco-confidential-16l", "kg": [22, 21], "stiffness": 222.3, "sim": 80},
           {"id": "toroline-o-toro-17", "kg": [23, 22], "stiffness": 165.7, "sim": 40}]


def test_tension_start_stiffer_string_lowers_tension():
    r = {"twu": {"stiffness_lbin": 252.3}}
    t = tension_start(r, ANCHORS)
    assert t["kg"] == [20.5, 19.5] and t["from"] == "solinco-confidential-16l"
    assert t["lbs"] == [45.0, 43.0] and t["indicative"] is True


def test_tension_start_delta_capped():
    t = tension_start({"twu": {"stiffness_lbin": 322.3}}, ANCHORS)
    assert t["kg"] == [20.0, 19.0]


def test_tension_start_without_twu_falls_back_to_anchor():
    t = tension_start({"twu": None}, ANCHORS)
    assert t["kg"] == [22, 21] and "senza dati TWU" in t["note"]


def test_discriminant_sorted_desc():
    recs = [dict(r) for r in POP_RECS]
    recs[0]["preference"] = recs[1]["preference"] = "liked"
    recs[8]["preference"] = recs[9]["preference"] = "disliked"
    d = discriminant_metrics(recs, population(recs))
    seps = [x["separation"] for x in d]
    assert seps == sorted(seps, reverse=True) and len(d) >= 4
