from pipeline.estimate import (calibrate_tester_spin, estimate_spin, estimate_stiffness, fit_linear,
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
