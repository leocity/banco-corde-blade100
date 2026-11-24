"""pipeline/hybrids.py: letto, confronto e giudizio come la pagina (fixture condivisa), poi geometria, tenuta, tensione e generatore."""
import json
import pathlib

import pytest

from pipeline.hybrids import (GOALS, W_COUNT, W_RANGE, bed_of, build_hybrids, can_full, can_half, compare_beds, evaluate_hybrid,
                              evaluate_inputs, generate, geometry, holding, hybrid_tension, judge_phys, k_at, make_context,
                              shape_class, stock_counts, value_of)

ROOT = pathlib.Path(__file__).resolve().parent.parent
FX = json.loads((ROOT / "tests/fixtures/hybrid_cases.json").read_text(encoding="utf-8"))
BY = {r["id"]: r for r in FX["strings"]}


def approx(a, b):
    return a == b == None or a == pytest.approx(b, rel=1e-9)  # noqa: E711


# ---- parità con la pagina ----
def test_bed_compare_and_judge_match_the_javascript_on_every_fixture_case():
    ref = FX["reference"]
    ref_bed = bed_of(BY[ref["id"]], BY[ref["id"]], ref["kg"])
    for c in FX["cases"]:
        bed = bed_of(BY[c["main"]], BY[c["cross"]], c["kg"])
        where = (c["main"], c["cross"], c["kg"])
        for k in ("kNow", "kAfter", "loss", "spin"):
            exp = c["bed"][k]
            assert (bed[k] is None) == (exp is None), (k, where)
            if exp:
                assert approx(bed[k]["v"], exp["v"]) and bed[k]["est"] == exp["est"], (k, where)
        assert bed["roundCross"] == c["bed"]["roundCross"] and bed["hybrid"] == c["bed"]["hybrid"]
        rows = compare_beds(bed, ref_bed)
        assert [(r["key"], r["level"], r["dir"], r["word"], r["est"], r["estA"]) for r in rows] == \
               [(r["key"], r["level"], r["dir"], r["word"], r["est"], r["estA"]) for r in c["rows"]], where
        assert all(approx(r["diff"], e["diff"]) for r, e in zip(rows, c["rows"])), where
        for g in GOALS:
            j = judge_phys(g, rows)
            assert j["ok"] == c["judge"][g]["ok"] and approx(j["score"], c["judge"][g]["score"]), (g, where)


# ---- matematica ----
def S(i, k=None, loss=None, spin=None, shape="RND", est=None, excel=None, derived=None, brand="B", model=None):
    twu = {"stiffness": k, "loss": loss, "spin": spin} if k is not None or loss is not None or spin is not None else None
    return {"id": f"s{i}", "brand": brand, "model": model or f"M{i}", "shape": shape, "lab": {"twu": twu, "rp": None, "excel": excel, "est": est or {}},
            "excel": excel, "derived": derived or {}}


def test_stiffness_grows_with_tension_and_is_the_measure_at_51_lb():
    assert k_at(200, 23.1) == pytest.approx(200) and k_at(200, 25) > 200 > k_at(200, 20)


def test_equivalent_stiffness_is_the_weighted_mean_and_range_shows_the_weight_uncertainty():
    V, O = S(1, 220, 25, 7.7), S(2, 170, 44, 9.4)
    bed = bed_of(V, O, [23.1, 23.1])
    assert bed["kNow"]["v"] == pytest.approx(W_COUNT * 220 + (1 - W_COUNT) * 170)
    assert bed["spin"]["v"] == pytest.approx(0.6 * 7.7 + 0.4 * 9.4)
    ctx = make_context([V, O])
    e = evaluate_hybrid(V, O, [23.1, 23.1], None, ctx)
    lo, hi = e["stiffness"]["range_k_now"]
    assert lo == pytest.approx(round(W_COUNT * 220 + (1 - W_COUNT) * 170, 1), abs=0.1)
    assert hi == pytest.approx(round(0.65 * 220 + 0.35 * 170, 1), abs=0.1) and hi > lo
    assert e["stiffness"]["delta_k51"] == 50 and e["stiffness"]["delta_k51_pct"] == pytest.approx(29.4, abs=0.1)
    assert W_RANGE[0] == W_COUNT and max(W_RANGE) == 0.65


def test_reliability_is_the_worst_of_the_two_strings_and_missing_is_explicit():
    V = S(1, 220, 25, 7.7)
    O = S(2, None, est={"twu.stiffness": {"kind": "modello", "v": 190.0}, "twu.loss": {"kind": "ricavata", "v": 30.0}, "twu.spin": {"kind": "ricavata", "v": 8.0}})
    e = evaluate_hybrid(V, O, [22, 21], None, make_context([V, O]))
    assert e["stiffness"]["reliability"] == "dalla fisica" and e["stiffness"]["cross"] == "dalla fisica" and e["stiffness"]["main"] == "misurata"
    none = S(3)
    e2 = evaluate_hybrid(V, none, [22, 21], None, make_context([V, none]))
    assert e2["stiffness"]["reliability"] == "mancante" and e2["stiffness"]["k51"] is None and e2["spin"] is None


def test_contested_twu_is_not_used_but_the_twu_free_estimate_is():
    r = S(1, 164.6, 41.7, 8.7, est={"twu.stiffness": {"kind": "modello", "v": 206.5}, "twu.loss": {"kind": "modello", "v": 38.0}, "twu.spin": {"kind": "modello", "v": 6.1}},
          derived={"twu_flag": {"untrusted": True, "reason": "contestata", "note": ""}})
    assert value_of(r, "twu.stiffness") == {"v": 206.5, "est": "modello"}
    assert value_of(S(2, 164.6), "twu.stiffness") == {"v": 164.6, "est": None}
    e = evaluate_hybrid(r, S(3, 190, 30, 8), [22, 21], None, make_context([r]))
    assert any("contestato" in f for f in e["flags"])


# ---- geometria ----
@pytest.mark.parametrize("v,o,tag", [("PENT", "RND", "classica"), ("SQ", "HEX", "classica"), ("PENT", "SQ", "doppia sagomata"),
                                     ("RND", "RND", "liscia-liscia"), ("HEX", "OCT", "uniforme"), ("RND", "SQ", "invertita")])
def test_geometry_tags(v, o, tag):
    g = geometry(S(1, shape=v, model="A"), S(2, shape=o, model="B"))
    assert g["tag"] == tag and "ipotesi" in g["basis"]


def test_geometry_unknown_shape_and_same_model_are_declared():
    assert geometry(S(1, shape=None), S(2, shape="RND"))["tag"] is None
    assert geometry(S(1, shape="HEX", model="X"), S(2, shape="HEX", model="X"))["tag"] == "stesso modello"
    assert shape_class("GEAR") == "sagomata" and shape_class(None) is None


# ---- tenuta ----
CTX_SD = {"sd": {"tl6": 3.0, "tl12": 4.0, "creep24": 0.1}, "by": {}, "anchors": {}}


def test_holding_twu_levels_and_who_gives_way_first():
    h = holding(S(1, 200, 44), S(2, 200, 25), CTX_SD)
    assert h["verdict"] == "sbilanciata" and h["weaker"] == "main" and h["twu"]["delta"] == 19
    assert holding(S(1, 200, 30), S(2, 200, 28), CTX_SD)["verdict"] == "bilanciata"
    assert holding(S(1, 200, 30), S(2, 200, 36), CTX_SD)["verdict"] == "leggermente sbilanciata"


def test_holding_sources_are_never_mixed_and_disagreement_is_declared():
    exV = {"tl6": 20.0, "tl12": 28.0, "static_24h_creep": 0.5}
    exO = {"tl6": 8.0, "tl12": 12.0, "static_24h_creep": 0.2}
    V, O = S(1, 200, 25, excel=exV), S(2, 200, 44, excel=exO)  # TWU: cede prima la cross; Excel: la main
    h = holding(V, O, CTX_SD)
    assert h["verdict"] == "fonti discordanti" and "nessuna conclusione" in h["note"]
    only_excel = holding(S(3, excel=exV), S(4, excel=exO), CTX_SD)
    assert only_excel["verdict"] == "sbilanciata (solo Excel)" and only_excel["weaker"] == "main" and only_excel["twu"] is None


def test_holding_ignores_a_loss_that_comes_only_from_physics():
    V = S(1, est={"twu.loss": {"kind": "modello", "v": 40.0}})
    O = S(2, est={"twu.loss": {"kind": "modello", "v": 20.0}})
    assert holding(V, O, CTX_SD)["verdict"] == "non valutabile"


# ---- tensione ----
def tension_rec(i, k, kg, anchor="a1"):
    return S(i, k, 30, 8, derived={"tension_start": {"kg": kg, "from": anchor, "slope_kg_per_lbin": -0.32 / 15}})


def test_tension_keeps_the_anchor_differential_and_corrects_for_the_equivalent_stiffness():
    anchor = S(0, 212.0)
    anchor["id"] = "a1"
    ctx = {"by": {"a1": anchor}, "sd": {}, "anchors": {"a1": [22, 21]}}
    V, O = tension_rec(1, 232.0, [21.5, 20.5]), tension_rec(2, 192.0, [22.5, 21.5])
    t = hybrid_tension(V, O, ctx, {"v": 0.457 * 232 + 0.543 * 192, "est": None})
    assert t["differential"] == 1 and t["kg"][0] - t["kg"][1] == 1 and t["anchor"] == "a1"
    assert t["per_string"] == [21.5, 21.5]
    assert hybrid_tension(V, O, ctx, {"v": 280.0, "est": None})["kg"] == [20.5, 19.5]  # +68 lb/in: -1,45 kg, arrotondato a mezzo kg
    stiffer = hybrid_tension(V, O, ctx, {"v": 400.0, "est": None})  # molto più rigido dell'ancora: scende, al massimo di 2 kg
    assert stiffer["kg"] == [20.0, 19.0]
    assert any("regola pratica" in f for f in hybrid_tension(V, O, {**ctx, "anchors": {"a1": [24, 21]}}, None)["flags"])


def test_tension_without_data_says_so():
    V = S(1, 200, 30, 8)
    t = hybrid_tension(V, V, {"by": {}, "sd": {}, "anchors": {}}, None)
    assert t["kg"] is None and "manca" in t["note"]


# ---- inventario e generazione ----
INV = {"equipped": {"id": "s9", "kg": [22, 21]}, "stock": [
    {"id": "s1", "size": "mezza", "n": 1}, {"id": "s2", "size": "mezza", "n": 2}, {"id": "s3", "size": "matassina", "n": 1}, {"id": "s4", "size": "intera", "n": 1}]}


def test_stock_rules_one_half_is_enough_for_a_hybrid_two_halves_or_a_skein_for_a_full_bed():
    c = stock_counts(INV)
    assert c["s4"]["matassina"] == 1  # «intera» è un sinonimo di matassina
    assert can_half(c, "s1") and not can_full(c, "s1")
    assert can_full(c, "s2") and can_full(c, "s3") and not can_half(c, "s9")


def pool():
    return [S(9, 195, 40, 7.8, "HEX"), S(1, 232, 25, 7.7, "PENT"), S(2, 170, 44, 9.4, "RND"), S(3, 205, 30, 8.0, "HEX"), S(4, 160, 41, 8.7, "RND"), S(5, 240, 24, 6.0, "SQ")]


def test_generate_uses_only_stock_respects_the_rule_and_never_pairs_the_same_model():
    rows = generate(pool(), INV, goal=None, limit=50)
    assert rows and all(r["from_stock"] == [True, True] for r in rows)
    ids = {(r["main"], r["cross"]) for r in rows}
    assert all("s5" not in p and "s9" not in p for p in ids)  # non sono in casa
    for V, O in ids:
        kv = {r["id"]: r for r in pool()}[V]["lab"]["twu"]["stiffness"]
        ko = {r["id"]: r for r in pool()}[O]["lab"]["twu"]["stiffness"]
        assert kv >= ko * 0.9, (V, O)  # la verticale non è più morbida dell'orizzontale
    assert len({tuple(sorted(p)) for p in ids}) == len(ids)  # una sola coppia per combinazione


def test_generate_with_a_goal_returns_only_matching_pairs_sorted_by_score():
    rows = generate(pool(), INV, goal="stiffer", limit=10)
    assert rows and all(r["vs_reference"] for r in rows)
    assert all(next(v for v in r["vs_reference"] if v["key"] == "kNow")["dir"] == "più" for r in rows)
    assert [r["score"] for r in rows] == sorted((r["score"] for r in rows), reverse=True)
    assert generate(pool(), {"equipped": INV["equipped"], "stock": []}, goal="stiffer") == []


def test_generate_buy_one_pairs_a_string_in_stock_with_one_to_buy():
    rows = generate(pool(), INV, goal=None, limit=50, mode="buy_one")
    assert rows and all(r["from_stock"].count(True) == 1 for r in rows)


def test_evaluate_inputs_reports_unknown_ids_instead_of_dropping_them():
    inputs = {"hybrids": [{"id": "ok", "main": "s1", "cross": "s2", "kg": [23, 22], "status": "montato", "note": "campo"},
                          {"id": "bad", "main": "s1", "cross": "nessuna", "status": "da_provare"}]}
    out, problems = evaluate_inputs(pool(), inputs, INV)
    assert [h["id"] for h in out] == ["ok"] and out[0]["status"] == "montato" and out[0]["note"] == "campo"
    assert problems == ["bad: corda sconosciuta (nessuna)"]
    assert build_hybrids(pool(), inputs, INV)["problems"] == problems


# ---- dati reali ----
def test_real_data_hybrids_file_matches_inputs_and_inventory():
    out = json.loads((ROOT / "data/hybrids.json").read_text(encoding="utf-8"))
    assert out["problems"] == []
    inputs = json.loads((ROOT / "data/hybrids_input.json").read_text(encoding="utf-8"))
    assert [h["id"] for h in out["evaluated"]] == [h["id"] for h in inputs["hybrids"]]
    for g in GOALS:
        assert g in out["suggested_from_stock"]
    for h in out["evaluated"]:
        assert h["stiffness"]["reliability"] in ("misurata", "ricavata", "dalla fisica", "mancante")
        assert h["geometry"]["basis"] and h["holding"]["verdict"]
