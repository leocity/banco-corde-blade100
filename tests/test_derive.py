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
    sub = {"spin": 60, "durability": 70, "affinity": 50}
    assert profile_score(sub, disliked_sim=50) - profile_score(sub, disliked_sim=80) == 15
    assert profile_score(sub, disliked_sim=50) == 60


def test_profile_score_renormalizes_missing():
    assert profile_score({"spin": 72, "durability": 50, "affinity": None}) == 64


def test_profile_score_requires_spin_and_durability():
    assert profile_score({"spin": 72, "durability": None, "affinity": 90}) is None
    assert profile_score({"spin": None, "durability": 80, "affinity": 90}) is None


def test_subscores_have_no_power_and_weights_are_independent():
    from pipeline.derive import DEFAULT_WEIGHTS
    s = subscores(POP_RECS[9], POP)
    assert "power" not in s and s["spin"] > 50 and s["comfort"] < 50
    assert set(DEFAULT_WEIGHTS) == {"spin", "durability", "affinity"}


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
    assert t["kg"] == [22, 21] and "senza una rigidità misurata" in t["note"]


def test_discriminant_sorted_desc():
    recs = [dict(r) for r in POP_RECS]
    recs[0]["preference"] = recs[1]["preference"] = "liked"
    recs[8]["preference"] = recs[9]["preference"] = "disliked"
    d = discriminant_metrics(recs, population(recs))
    seps = [x["separation"] for x in d]
    assert seps == sorted(seps, reverse=True) and len(d) >= 4


def test_similarity_is_smooth_not_clipped_to_zero():
    # due deviazioni standard di distanza su tutte le feature: deve restare > 0 (curva gaussiana)
    far = dict(POP_RECS[9], shape="HEX")
    s = similarity(POP_RECS[0], far, POP)
    assert 0 < s < 30


def test_tension_note_uses_readable_anchor_name():
    t = tension_start({"twu": {"stiffness_lbin": 252.3}}, ANCHORS)
    assert "Confidential 1.25" in t["note"] and "solinco-confidential-16l" not in t["note"]


def test_disliked_flag_requires_dominance_over_liked():
    from pipeline.derive import disliked_flag
    assert disliked_flag(best_liked=97, worst_disliked=80) is False
    assert disliked_flag(best_liked=50, worst_disliked=80) is True
    assert disliked_flag(best_liked=None, worst_disliked=80) is True
    assert disliked_flag(best_liked=10, worst_disliked=70) is False
    assert disliked_flag(best_liked=10, worst_disliked=None) is False


def test_similarity_for_excel_and_racketpedia_only_strings():
    pop_recs = [dict(r, rpedia={"static_stiffness_kgmm": 0.8 + i * 0.05}) for i, r in enumerate(POP_RECS)]
    pop = population(pop_recs)
    excel_only = {"shape": "HEX", "twu": None, "rpedia": {"static_stiffness_kgmm": 1.0},
                  "excel": {"stiff_index_avg": 4.0, "tl6": 14.0}}
    assert similarity(excel_only, pop_recs[4], pop) is not None


def test_shared_feature_count():
    from pipeline.derive import shared_features
    excel_only = {"twu": None, "rpedia": None, "excel": {"stiff_index_avg": 4.0, "tl6": 14.0}}
    assert shared_features(excel_only, POP_RECS[1]) == 2
    assert shared_features(POP_RECS[1], POP_RECS[2]) == 5


def test_sources_disagree_when_excel_soft_but_twu_stiff():
    from pipeline.derive import sources_disagree
    soft_excel_stiff_twu = {"twu": {"stiffness_lbin": 242.0}, "excel": {"stiff_index_avg": 6.6}}
    consistent = {"twu": {"stiffness_lbin": 242.0}, "excel": {"stiff_index_avg": 3.1}}
    assert sources_disagree(soft_excel_stiff_twu, POP) is True
    assert sources_disagree(consistent, POP) is False
    assert sources_disagree({"twu": None, "excel": {"stiff_index_avg": 6.6}}, POP) is False
