from pipeline.estimate import (fit_spin_model, model_spin, calibrate_tester_spin, estimate_spin, estimate_stiffness, fit_linear,
                               loo_mae, relatives_of)

POP = [4.0, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 9.0, 10.0]
GOOD = {"a": 0.1, "b": 0.0, "mae": 0.8, "baseline_mae": 1.2, "usable": True}
BAD = {"a": 0.1, "b": 0.0, "mae": 1.3, "baseline_mae": 1.2, "usable": False}


def rec(id_, model="X", twu=None, mm=1.25, rp=None):
    return {"id": id_, "brand": "B", "model": model, "gauge_mm": mm, "twu": twu,
            "rpedia": {"static_stiffness_kgmm": rp} if rp else None}


def test_measured_spin_never_overwritten_by_relative():
    r = rec("b-x-17", twu={"match": "exact", "spin_potential": 7.0, "stiffness_lbin": 200.0})
    rel = [rec("b-x-16", twu={"match": "exact", "spin_potential": 9.0, "stiffness_lbin": 210.0}, mm=1.30)]
    s = estimate_spin(r, rel, None, GOOD, POP)
    assert s["value"] == 7.0 and s["kind"] == "misurato"


def test_relative_used_when_no_measure():
    rel = [rec("b-x-16", twu={"match": "exact", "spin_potential": 9.0, "stiffness_lbin": 210.0}, mm=1.30)]
    s = estimate_spin(rec("b-x-17"), rel, None, GOOD, POP)
    assert s["kind"] == "parente" and s["value"] == 9.0 and s["low"] == 8.5 and s["high"] == 9.5


def test_tester_calibration_used_only_if_usable():
    agg = {"score": {"spin": 80.0}, "level": {"spin": 4.0}}
    assert estimate_spin(rec("b-y-17"), [], agg, GOOD, POP)["kind"] == "tester"
    s = estimate_spin(rec("b-y-17"), [], agg, BAD, POP)
    assert s["kind"] == "qualitativo" and s["low"] < s["value"] < s["high"]


def test_no_information_gives_none():
    assert estimate_spin(rec("b-z-17"), [], None, GOOD, POP) is None


def test_loo_mae_zero_on_perfect_line_and_fit():
    xs, ys = [1, 2, 3, 4, 5], [3, 5, 7, 9, 11]
    a, b = fit_linear(xs, ys)
    assert round(a, 6) == 2 and round(b, 6) == 1 and loo_mae(xs, ys) < 1e-9


def test_calibration_flags_unusable_when_worse_than_mean():
    noise = [(10, 5.0), (20, 9.0), (30, 4.0), (40, 8.0), (50, 5.5), (60, 7.0), (70, 4.5), (80, 6.0)]
    c = calibrate_tester_spin(noise)
    assert c["usable"] is (c["mae"] < c["baseline_mae"])


def test_relatives_match_colour_variants():
    a = rec("toroline-toro-toro-pink-17", model="Toro Toro Pink", twu={"match": "exact", "spin_potential": 8.0, "stiffness_lbin": 190.0})
    b = rec("toroline-toro-toro-orange-17", model="Toro Toro Orange")
    c = rec("toroline-o-toro-17", model="O-Toro", twu={"match": "exact", "spin_potential": 9.4, "stiffness_lbin": 165.7})
    for r in (a, b, c):
        r["brand"] = "Toroline"
    assert [x["id"] for x in relatives_of(b, [a, b, c])] == ["toroline-toro-toro-pink-17"]


def test_stiffness_from_racketpedia_regression():
    s = estimate_stiffness(rec("b-r-17", rp=1.0), [], (100.0, 110.0, 12.0), None, [180.0, 200.0, 220.0])
    assert s["kind"] == "da Racketpedia" and s["value_lbin"] == 210.0 and s["low"] == 198.0


def test_calibration_with_negative_slope_or_no_gain_is_unusable():
    flat = [(40, 7.0), (50, 6.8), (60, 7.1), (70, 6.9), (80, 6.95), (90, 6.85), (55, 7.05), (65, 6.9)]
    assert calibrate_tester_spin(flat)["usable"] is False
    good = [(40, 4.0), (50, 5.1), (60, 5.9), (70, 7.2), (80, 7.9), (90, 9.1), (55, 5.4), (65, 6.6)]
    assert calibrate_tester_spin(good)["usable"] is True


def test_qualitative_spin_without_number_when_backtest_fails():
    agg = {"score": {"spin": None}, "level": {"spin": 4.0}}
    s = estimate_spin(rec("b-q-17"), [], agg, BAD, POP, qual_usable=False)
    assert s["kind"] == "qualitativo" and s["value"] is None and s["level"] == 4.0


def test_backtest_qualitative():
    from pipeline.estimate import backtest_qualitative
    # livelli casuali rispetto allo spin vero: non deve risultare utile
    pairs = [(5, 4.0), (1, 9.0), (4, 5.0), (2, 8.5), (5, 5.5), (3, 7.5), (1, 6.0), (4, 4.5)]
    bt = backtest_qualitative(pairs, POP)
    assert bt["usable"] is False and bt["mae"] >= bt["baseline_mae"]


def _train(n=40):
    # spin cala con la rigidità e sale per le esagonali, più un po' di rumore deterministico
    rows = []
    for i in range(n):
        st = 160 + (i * 7) % 80
        hexa = i % 5 == 0
        y = 9.0 - 0.025 * (st - 160) + (1.2 if hexa else 0.0) + ((i * 37) % 11 - 5) * 0.05
        rows.append((float(st), "HEX" if hexa else "RND", y))
    return rows


def test_spin_model_usable_and_predicts_direction():
    m = fit_spin_model(_train())
    assert m["stiffness_shape"]["usable"] and m["stiffness_shape"]["mae"] < m["stiffness_shape"]["baseline_mae"]
    soft = model_spin({"shape": "RND"}, {"value_lbin": 165.0, "low": 165.0, "high": 165.0}, m)
    stiff = model_spin({"shape": "RND"}, {"value_lbin": 235.0, "low": 235.0, "high": 235.0}, m)
    assert soft["kind"] == "modello" and soft["value"] > stiff["value"] and soft["low"] < soft["value"] < soft["high"]


def test_spin_model_not_used_when_it_does_not_beat_the_mean():
    noise = [(160.0 + (i * 7) % 80, "RND", [4.0, 9.0, 6.0, 7.5, 5.0][(i * 3) % 5]) for i in range(40)]
    assert not fit_spin_model(noise)["stiffness_shape"]["usable"]
    assert model_spin({"shape": "RND"}, {"value_lbin": 200.0}, fit_spin_model(noise)) is None


def test_model_never_overrides_measured_or_relative():
    m = fit_spin_model(_train())
    measured = rec("b-x-17", twu={"match": "exact", "spin_potential": 7.0, "stiffness_lbin": 200.0})
    assert estimate_spin(measured, [], None, GOOD, POP, model=m, stiffness={"value_lbin": 200.0})["kind"] == "misurato"
    rel = [rec("b-x-16", twu={"match": "exact", "spin_potential": 9.0, "stiffness_lbin": 210.0}, mm=1.30)]
    assert estimate_spin(rec("b-x-17"), rel, None, GOOD, POP, model=m, stiffness=None)["kind"] == "parente"


def test_model_estimate_widens_with_uncertain_stiffness():
    m = fit_spin_model(_train())
    sure = model_spin({"shape": "RND"}, {"value_lbin": 200.0, "low": 200.0, "high": 200.0}, m)
    unsure = model_spin({"shape": "RND"}, {"value_lbin": 200.0, "low": 150.0, "high": 250.0}, m)
    assert unsure["high"] - unsure["low"] > sure["high"] - sure["low"]


# ---- rigidità: gemelli corretti per calibro, modello sul solo calibro ----
from pipeline.estimate import fit_gauge_model, fit_stiffness_model, twu_gauge_mm, model_stiffness, siblings_with_rp

GAUGE = {"slope": 200.0, "mae": 9.0, "copy_mae": 13.0, "q80": 15.0, "usable": True}


def srec(id_, model, mm, st=None, match="exact"):
    return {"id": id_, "brand": "B", "model": model, "gauge_mm": mm,
            "twu": {"match": match, "stiffness_lbin": st, "twu_name": f"B {model}"} if st is not None else None, "rpedia": None}


def test_twu_gauge_parsing():
    assert twu_gauge_mm({"twu_name": "Kirschbaum Flash 16 (1.30)"}) == 1.30
    assert twu_gauge_mm({"twu_name": "Kirschbaum Competition 16/1.30"}) == 1.30
    assert twu_gauge_mm({"twu_name": "Luxilon Element Soft IR 1.27"}) == 1.27
    assert twu_gauge_mm({"twu_name": "Babolat RPM Blast 16"}) == 1.30
    assert twu_gauge_mm({"twu_name": "Solinco X"}) is None


def test_sibling_stiffness_is_corrected_for_gauge_with_margin():
    sib = srec("b-x-16", "X", 1.30, 220.0)
    s = estimate_stiffness(srec("b-x-17", "X", 1.20), [sib], None, None, [], gauge=GAUGE)
    assert s["kind"] == "parente" and abs(s["value_lbin"] - 200.0) < 0.1 and s["low"] < 200 < s["high"]
    same = estimate_stiffness(srec("b-x-16b", "X", 1.30), [sib], None, None, [], gauge=GAUGE)
    assert same["value_lbin"] == 220.0 and same["low"] == same["high"]


def test_twu_proxy_row_is_gauge_corrected():
    r = {"id": "b-y-16l", "brand": "B", "model": "Y", "gauge_mm": 1.25,
         "twu": {"match": "proxy", "stiffness_lbin": 222.0, "twu_name": "B Y 16 (1.30)"}}
    s = estimate_stiffness(r, [], None, None, [], gauge=GAUGE)
    assert s["kind"] == "parente" and abs(s["value_lbin"] - 212.0) < 0.1 and s["from_lbin"] == 222.0


def test_measured_stiffness_never_changed_by_gauge():
    r = srec("b-z-17", "Z", 1.20, 210.0)
    assert estimate_stiffness(r, [], None, None, [], gauge=GAUGE)["value_lbin"] == 210.0


def test_stiffness_model_gauge_only_and_no_reviews():
    train = [(1.18 + 0.01 * (i % 13), 190 + 200 * 0.01 * (i % 13) + ((i * 7) % 9 - 4) * 2.0) for i in range(40)]
    m = fit_stiffness_model(train)
    assert set(m) == {"gauge"} and m["gauge"]["usable"]
    thick = model_stiffness({"gauge_mm": 1.30}, m)
    thin = model_stiffness({"gauge_mm": 1.18}, m)
    assert thick["kind"] == "modello" and thick["value_lbin"] > thin["value_lbin"] and thick["low"] < thick["value_lbin"] < thick["high"]
    assert model_stiffness({"gauge_mm": None}, m) is None


def test_rp_sibling_used_with_gauge_correction_and_wider_margin():
    sib = {"id": "b-v-17", "brand": "B", "model": "V", "gauge_mm": 1.23, "rpedia": {"static_stiffness_kgmm": 1.05}}
    r = {"id": "b-v-16", "brand": "B", "model": "V", "gauge_mm": 1.28, "twu": None, "rpedia": None}
    assert siblings_with_rp(r, [sib, r]) == [sib]
    s = estimate_stiffness(r, [], (67.79, 140.28, 11.3), None, [], gauge=GAUGE, rp_siblings=[sib])
    base = 67.79 * 1.05 + 140.28
    assert s["kind"] == "da Racketpedia" and s["via"] == "gemello" and abs(s["value_lbin"] - (base + 200 * 0.05)) < 0.2
    assert (s["high"] - s["low"]) / 2 > 11.3


def test_gauge_model_needs_enough_pairs():
    assert fit_gauge_model([srec("a-1", "A", 1.25, 200.0)])["usable"] is False
