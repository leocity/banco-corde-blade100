"""Registro delle prove di campo: validazione, calo DT, ore alla soglia, riepilogo, e isolamento dal laboratorio."""
import copy
import json
import pathlib

from pipeline.export_ai import build_export
from pipeline.field_tests import ALERT_LOSS_PCT, analyze, dt_series, hours_to_alert, validate_test

ROOT = pathlib.Path(__file__).resolve().parent.parent
S = json.loads((ROOT / "data/strings.json").read_text(encoding="utf-8"))["strings"]
IDS = {r["id"] for r in S}
INV = json.loads((ROOT / "data/inventory.json").read_text(encoding="utf-8"))
TEST = {"setup_id": "tour-fb", "mains": "toroline-o-toro-tour-17", "cross": "toroline-o-toro-tour-17", "tension_kg": [22.0, 21.0], "court_temp_c": 16, "surface": "clay_indoor",
        "dt_log": {"0h": 100.0, "24h": 95.0, "4h": 90.0, "8h": 86.0, "12h": 82.0},
        "feel_1_5": {"compactness_vs_confidential": 4, "snapback_vs_otoro": 4, "launch_angle": 2, "flat_control": 5, "arm_comfort": 3},
        "snapback_check_8h": 3, "notching_8h": "low", "playability_hours": 14, "verdict": "liked"}


def test_seed_file_is_valid_and_the_schema_example_passes():
    seed = json.loads((ROOT / "data/field_tests.json").read_text(encoding="utf-8"))
    assert all(validate_test(t, IDS) == [] for t in seed["tests"])
    assert validate_test(TEST, IDS) == []


def test_validation_rejects_bad_values():
    bad = copy.deepcopy(TEST)
    bad.update(mains="boh", tension_kg=[22], verdict="mah", snapback_check_8h=4, notching_8h="enorme", playability_hours=-2, colore="blu")
    bad["dt_log"] = {"0h": None, "8h": 80, "x": 3, "4h": -1}
    bad["feel_1_5"] = {"launch_angle": 6, "gusto": 3}
    errs = " | ".join(validate_test(bad, IDS))
    for frag in ("mains sconosciuta", "tension_kg", "verdict", "snapback", "notching", "playability_hours", "campo sconosciuto", "manca la 0h", "chiave dt_log", "dt_log[4h]", "launch_angle", "voto sconosciuto"):
        assert frag in errs, frag


def test_loss_is_relative_to_0h_and_24h_is_rest_not_play():
    s = dt_series(TEST["dt_log"])
    assert [(x["key"], x["kind"], x["loss_pct"]) for x in s] == [("24h", "riposo", 5.0), ("4h", "gioco", 10.0), ("8h", "gioco", 14.0), ("12h", "gioco", 18.0)]
    assert dt_series({"0h": None, "4h": 90}) == []


def test_hours_to_threshold_interpolates_between_play_measurements():
    s = dt_series(TEST["dt_log"])
    assert ALERT_LOSS_PCT == 15.0 and hours_to_alert(s) == 9.0   # 14% a 8h, 18% a 12h: 15% a 9h
    assert hours_to_alert(s, 30) is None
    assert hours_to_alert(dt_series({"0h": 100, "24h": 80})) is None  # il calo a riposo non conta come ore di gioco


def test_summary_puts_lab_data_beside_observation_without_fusing_them():
    r = analyze([TEST], S, {"plan": [{"main": TEST["mains"], "cross": TEST["cross"], "ore_ipotesi": [12, 16]}]})
    row = r["prove"][0]
    assert r["problems"] == [] and row["loss_ultima_pct"] == 18.0 and row["ore_alla_soglia"] == 9.0
    assert row["laboratorio"]["twu_o_ricavata_loss_pct"] == 25.0 and "non si convertono" in row["laboratorio"]["nota"]
    assert row["ore_ipotesi_piano"] == [12, 16] and row["ore_giocabili"] == 14
    assert row["excel"] is None  # la Tour non è nell'Excel: nessun valore inventato
    o = analyze([{**TEST, "mains": "toroline-o-toro-17", "cross": "toroline-o-toro-17"}], S)["prove"][0]
    assert o["excel"]["creep24"] == 0.32 and o["loss_ultima_pct"] == 18.0  # Excel accanto, non mescolato al calo osservato
    assert r["per_setup"][0]["feel_medio"]["flat_control"] == 5.0 and r["per_setup"][0]["verdetti"] == {"liked": 1}


def test_invalid_tests_are_reported_and_skipped():
    r = analyze([TEST, {"setup_id": "x", "mains": "boh", "cross": "boh", "tension_kg": [22, 21]}], S)
    assert len(r["prove"]) == 1 and r["problems"]


def test_field_data_never_changes_lab_data_or_scores_in_the_export():
    base = build_export(S, INV, {}, field={"tests": []})
    with_f = build_export(S, INV, {}, field={"tests": [TEST]})
    assert base["corde"] == with_f["corde"] and base["ibridi"] == with_f["ibridi"] and base["ancore"] == with_f["ancore"]
    assert with_f["prove_tue"]["schede"] and not base["prove_tue"]["schede"]
    assert all("prove" not in c and "field" not in c for c in with_f["corde"])


def test_scoring_modules_do_not_import_user_data():
    for m in ("derive", "lab", "estimate", "hybrid_role", "twuflag", "twu_compare", "pairing", "build", "reviews", "scope"):
        src = (ROOT / "pipeline" / f"{m}.py").read_text(encoding="utf-8")
        assert "field_tests" not in src and "test_plan" not in src, m
    assert "field_tests" not in json.dumps([r["derived"] for r in S]) and "playability" not in json.dumps([r["lab"] for r in S])
