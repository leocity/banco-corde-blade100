import json
import pathlib

import pytest

from pipeline.pairing import band_for, fit_to, pairing

CASES = json.loads((pathlib.Path(__file__).parent / "fixtures" / "pairing_cases.json").read_text(encoding="utf-8"))
KEYS = ("score", "band", "n_dims", "missing", "no_spin", "best_ref", "penalized")


@pytest.mark.parametrize("c", CASES, ids=[c["name"] for c in CASES])
def test_fixture_cases(c):
    got = pairing(c["dims"], c["liked"], c["disliked"], c["penalize"])
    assert {k: got[k] for k in KEYS} == c["expect"]


def test_fits_direction_above_and_below():
    ref = {"id": "r", "dims": dict(stiffness=50, durability=50, control=50, elasticity=50, spin=50)}
    up = pairing(dict(stiffness=65, durability=50, control=50, elasticity=50, spin=50), [ref], [])
    assert up["fits"]["stiffness"] == {"fit": 50.0, "dir": "above"}
    down = pairing(dict(stiffness=35, durability=50, control=50, elasticity=50, spin=50), [ref], [])
    assert down["fits"]["stiffness"]["dir"] == "below"
    near = pairing(dict(stiffness=53, durability=50, control=50, elasticity=50, spin=50), [ref], [])
    assert near["fits"]["stiffness"] == {"fit": 100.0, "dir": "in"}


def test_fit_to_none_without_common_dims():
    assert fit_to({"stiffness": None}, {"stiffness": 50}) is None


def test_band_thresholds():
    assert [band_for(s) for s in (100, 80, 79, 60, 59, 40, 39, 0)] == [
        "Ottimo", "Ottimo", "Buono", "Buono", "Attenzione", "Attenzione", "Poco adatta", "Poco adatta"]
